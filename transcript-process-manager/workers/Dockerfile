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
COPY fw-worker.py .

# Command to run the worker
CMD ["python", "fw-worker.py"]