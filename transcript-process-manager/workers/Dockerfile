FROM python:3.11-slim

# ffmpeg for whisper
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache for Whisper models.
ENV HF_HOME=/cache
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# CTranslate2's wheel ships without the CUDA math libraries: the NVIDIA runtime only
# injects the GPU driver, so cuBLAS and cuDNN (9.x for CUDA 12) must come from the image.
RUN pip install --no-cache-dir nvidia-cublas-cu12 "nvidia-cudnn-cu12==9.*"
ENV LD_LIBRARY_PATH=/usr/local/lib/python3.11/site-packages/nvidia/cublas/lib:/usr/local/lib/python3.11/site-packages/nvidia/cudnn/lib

COPY fw-worker.py .

# Command to run the worker
CMD ["python", "fw-worker.py"]