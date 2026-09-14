import os
import sys
import io
import asyncio
import time
import urllib.parse
from typing import BinaryIO
import requests
from dotenv import load_dotenv
import redis
from bullmq import Worker, Queue
import ctranslate2
from faster_whisper import WhisperModel

load_dotenv()

# Environment Configurations
REDIS_URL = os.getenv("REDIS_URL") or "redis://localhost:6379/"
JOBS_QUEUE = os.getenv("JOBS_QUEUE") or "jobs"
RESULTS_QUEUE = os.getenv("RESULTS_QUEUE") or "results"
MODEL_NAME = os.getenv("MODEL_NAME") or "tiny"
S3_URL = os.getenv("S3_URL") or "http://localhost:3005"
AUDIO_BUCKET = os.getenv("AUDIO_BUCKET") or "audio"

# Redis & BullMQ
r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
results_queue = Queue(RESULTS_QUEUE, {"connection": REDIS_URL})

# Dynamic Device & Compute Type Detection
has_cuda = ctranslate2.get_cuda_device_count() > 0
device = "cuda" if has_cuda else "cpu"
compute_type = "float16" if has_cuda else "int8"

print(f"Loading faster-whisper model '{MODEL_NAME}' on {device.upper()} ({compute_type})...")
model = WhisperModel(MODEL_NAME, device=device, compute_type=compute_type)
print("Model loaded successfully.")

last_active_time = time.time()
IDLE_TIMEOUT_SECONDS = 600  # 10 minutes

def bucket_base(bucket: str) -> str:
    return f"{S3_URL}/buckets/{bucket}"

def s3_download(object_name: str, bucket: str) -> BinaryIO:
    name = os.path.basename(object_name)
    encoded_name = urllib.parse.quote(name, safe="")
    
    response = requests.get(f"{bucket_base(bucket)}/objects/{encoded_name}", stream=True)
    response.raise_for_status()
    return response.raw

async def cleanup(worker: Worker):
    await worker.close()
    await results_queue.close()

async def process_job(job, token):
    global last_active_time
    last_active_time = time.time()
    
    data = job.data
    audio_id = data["audio_id"]
    audio_path = data["audio_name"]
    language = data.get("language")

    print(f"Received job for audio_id: {audio_id}")

    # Fetch raw stream and wrap in BytesIO for PyAV seek support
    audio_buffer = s3_download(object_name=audio_path, bucket=AUDIO_BUCKET)
    print("Downloaded buffer: ", audio_buffer)
    audio_bytes = io.BytesIO(audio_buffer.read())

    # Transcribe
    segments, _ = model.transcribe(audio_bytes, language=language)
    full_text = " ".join([segment.text.strip() for segment in segments])

    # Push result to BullMQ results queue
    await results_queue.add(
        name=f"result-{audio_id}",
        data={
            "audio_id": audio_id,
            "text": full_text,
        },
        # opts={"removeOnComplete": True},
    )

    print(f"Finished audio_id: {audio_id}")
    last_active_time = time.time()
    return {"status": "ok"}

async def idle_checker(worker: Worker):
    while True:
        await asyncio.sleep(15)
        if time.time() - last_active_time > IDLE_TIMEOUT_SECONDS:
            print("Idle for 10 minutes. Stopping worker container...")
            await cleanup(worker)
            sys.exit(0)

async def main():
    worker = Worker(JOBS_QUEUE, process_job, {"connection": REDIS_URL})
    print(f"Worker connected to '{JOBS_QUEUE}'. Awaiting jobs...")
    await asyncio.gather(idle_checker(worker))

if __name__ == "__main__":
    asyncio.run(main())

# #TODO: change from mlx_whisper to faster-whisper
# # For development purposes, run in terminal (make Redis accessible in docker compose)
#     # mlx_whisper cannot run in a linux based docker container
# # Maintain the following .env:
# # REDIS_URL
# # JOBS_QUEUE
# # RESULTS_QUEUE
# # MODEL_NAME
# # S3_URL
# # AUDIO_BUCKET


# import os
# import sys
# import asyncio
# import time
# from dotenv import load_dotenv
# import redis
# import urllib.parse
# import requests
# from typing import BinaryIO
# from bullmq import Worker, Queue

# import mlx.core as mx
# from mlx_whisper.transcribe import ModelHolder
# import mlx_whisper

# # Redis
# load_dotenv()
# REDIS_URL = os.getenv("REDIS_URL") or "redis://localhost:6379/"
# JOBS_QUEUE = os.getenv("JOBS_QUEUE") or "jobs"
# RESULTS_QUEUE = os.getenv("RESULTS_QUEUE") or "results"
# r = redis.Redis(host="redis", port=6379, decode_responses=True)
# results_queue = Queue(RESULTS_QUEUE, {"connection": REDIS_URL})

# MODEL_NAME = os.getenv("MODEL_NAME") or "whisper-large-v3-turbo" #Use base model for dev
# model_repo = "mlx-community/whisper-large-v3-turbo"

# S3_URL = os.getenv("S3_URL") or 'http://localhost:3005'
# AUDIO_BUCKET = os.getenv("AUDIO_BUCKET") or 'audio'

# async def cleanup(worker):
#     await worker.close()

# def bucket_base(bucket: str) -> str:
#     return f"{S3_URL}/buckets/{bucket}"

# def s3_download(object_name: str, bucket: str) -> BinaryIO:
#     name = os.path.basename(object_name)
#     encoded_name = urllib.parse.quote(name, safe="")
    
#     try:
#         response = requests.get(f"{bucket_base(bucket)}/objects/{encoded_name}", stream=True)
#         response.raise_for_status()
#         return response.raw

#     except Exception as err:
#         raise err

# # Preload the model
# ModelHolder.get_model(model_repo, mx.float16)

# last_active_time = time.time()
# IDLE_TIMEOUT_SECONDS = 600  # 10min

# async def process_job(job, token):
#     print("Job arrived")
    
#     global last_active_time
#     last_active_time = time.time()
    
#     data = job.data
#     audio_id = data["audio_id"]
#     audio_path = data["audio_name"]
#     language = data.get("language")

#     # Fetch buffer stream from s3 storage
#     audio_buffer = s3_download(object_name=audio_path, bucket=AUDIO_BUCKET)
#     result = mlx_whisper.transcribe(audio_buffer, path_or_hf_repo=model_repo, language=language)
    
#     await results_queue.add(
#         name=f"result-{audio_id}",
#         data={
#             "audio_id": audio_id,
#             "text": result["text"],
#         },
#     )
    
#     last_active_time = time.time()
#     return {"status": "ok"}

# # Terminates itself if idle for 10mins
# async def idle_checker(worker):
#     while True:
#         await asyncio.sleep(15)
#         if time.time() - last_active_time > IDLE_TIMEOUT_SECONDS:
#             print("Idle for 10 minutes. Exiting container to free VRAM...")
#             await cleanup(worker)
#             sys.exit(0)

# async def main():
#     worker = Worker(JOBS_QUEUE, process_job, {"connection": REDIS_URL})
#     print("Worker connected")
#     await asyncio.gather(idle_checker(worker))

# if __name__ == "__main__":
#     asyncio.run(main())