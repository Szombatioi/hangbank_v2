docker run -d --rm \
--name "whisper-batch-worker" \
--label "app.service=whisper-batch-worker" \
--label "app.managed-by=tms" \
-e REDIS_URL="localhost:6379" \
-e JOBS_QUEUE="jobs" \
-e RESULTS_QUEUE="results" \
-e MODEL_NAME="whisper-tiny" \
-e S3_URL="localhost:3005" \
-e AUDIO_BUCKET="audio" \
fw-worker