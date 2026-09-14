import os
import sys
import asyncio
import time
import io
from dotenv import load_dotenv
import redis
import urllib.parse
import requests
from typing import BinaryIO
from bullmq import Worker, Queue

from faster_whisper import WhisperModel
import ctranslate2

has_cuda = ctranslate2.get_cuda_device_count() > 0
device = "cuda" if has_cuda else "cpu"
compute_type = "float16" if has_cuda else "int8"

# Redis
load_dotenv()
REDIS_URL = os.getenv("REDIS_URL") or "redis://localhost:6379/"
JOBS_QUEUE = os.getenv("JOBS_QUEUE") or "jobs"
RESULTS_QUEUE = os.getenv("RESULTS_QUEUE") or "results"
r = redis.Redis(host="redis", port=6379, decode_responses=True)
results_queue = Queue(RESULTS_QUEUE, {"connection": REDIS_URL})

MODEL_NAME = os.getenv("MODEL_NAME") or "large-v3-turbo"

S3_URL = os.getenv("S3_URL") or 'http://localhost:3005'
AUDIO_BUCKET = os.getenv("AUDIO_BUCKET") or 'audio'

async def cleanup(worker):
    await worker.close()

def bucket_base(bucket: str) -> str:
    return f"{S3_URL}/buckets/{bucket}"

def s3_download(object_name: str, bucket: str) -> BinaryIO:
    name = os.path.basename(object_name)
    encoded_name = urllib.parse.quote(name, safe="")
    
    try:
        response = requests.get(f"{bucket_base(bucket)}/objects/{encoded_name}", stream=True)
        response.raise_for_status()
        return response.raw

    except Exception as err:
        raise err

# 1. Preload the model into GPU memory
print(f"Loading {MODEL_NAME}...")
# device="auto" automatically picks CUDA/GPU if available, otherwise falls back to CPU
model = WhisperModel(MODEL_NAME, device=device, compute_type=compute_type)
print("Model loaded.")

last_active_time = time.time()
IDLE_TIMEOUT_SECONDS = 600  # 10min

async def process_job(job, token):
    print("Job arrived")
    
    global last_active_time
    last_active_time = time.time()
    
    data = job.data
    audio_id = data["audio_id"]
    audio_path = data["audio_name"]
    language = data.get("language")

    # Fetch buffer stream from s3 storage
    audio_buffer = s3_download(object_name=audio_path, bucket=AUDIO_BUCKET)
    
    # Wrap raw network stream in BytesIO so PyAV/FFmpeg can seek() through it properly
    audio_bytes = io.BytesIO(audio_buffer.read())
    
    # Transcribe using faster-whisper
    segments, info = model.transcribe(audio_bytes, language=language)
    
    # faster-whisper returns a generator; we must iterate to actually perform the inference
    full_text = " ".join([segment.text.strip() for segment in segments])
    
    await results_queue.add(
        name=f"result-{audio_id}",
        data={
            "audio_id": audio_id,
            "text": full_text,
        },
    )
    
    last_active_time = time.time()
    return {"status": "ok"}

# Terminates itself if idle for 10mins
async def idle_checker(worker):
    while True:
        await asyncio.sleep(15)
        if time.time() - last_active_time > IDLE_TIMEOUT_SECONDS:
            print("Idle for 10 minutes. Exiting container to free VRAM...")
            await cleanup(worker)
            sys.exit(0)

async def main():
    worker = Worker(JOBS_QUEUE, process_job, {"connection": REDIS_URL})
    print("Worker connected")
    await asyncio.gather(idle_checker(worker))

if __name__ == "__main__":
    asyncio.run(main())