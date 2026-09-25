Frontend: `localhost:3000`
    * NEXT_PUBLIC_BACKEND_URL
    * NEXT_PUBLIC_SUBMIT_URL
Backend: `localhost:3001`
    * db: 5433
    * PORT (default `3001`)
    * ENABLED_URLS (default `http://localhost:3000`)
    * JWT_SECRET
    * DB_TYPE (default `postgres`)
    * DB_HOST (default `localhost`)
    * DB_PORT (default `5432`)
    * DB_USERNAME (default `hangbank`)
    * DB_PASSWORD (default `hangbank`)
    * DB_DATABASE (default `hangbank_dev`)
    * AUTH_SERVICE_URL
    * AQC_SERVICE_URL (default `http://localhost:3002`)
    * S3_STORAGE_SERVICE_URL (default `http://localhost:3005`)
AQC: `localhost:3002`
    * PORT (default `3002`)
    * VOLUME_CHECK_WINDOW_MS (default `200`)
    * VOLUME_CHECK_OVERLAP_MS (default `100`)
    * VOLUME_CHECK_TOO_QUIET_THRESHOLD (default `-40`)
    * VOLUME_CHECK_TOO_LOUD_THRESHOLD (default `-5`)
TPS: `localhost:3004`
    * PORT (default `3004`)
    * REDIS_URL (default `redis://localhost:6379`)
    * BACKEND_URL (default `localhost:3001`)
    * FW_IMAGE (default `fw-worker:latest`)
    * FW_LABEL (default `whisper-batch-worker`)
    * REDIS_ID (default = `REDIS_URL`; url a workerek felől nézve)
    * JOBS_QUEUE (default `jobs`)
    * RESULTS_QUEUE (default `results`)
    * MODEL_NAME (default `tiny`)
    * S3_URL (default `http://host.docker.internal:3005`; workerek felől)
    * AUDIO_BUCKET (default `audio`)
    * DOCKER_SOCKET_PATH (default `/var/run/docker.sock`, Windows-on `//./pipe/docker_engine`)
S3: `localhost:3005`
    * PORT (default `3005`)
    * MINIO_ENDPOINT (default `localhost`)
    * MINIO_PORT (default `9000`)
    * MINIO_USE_SSL (default `false`)
    * MINIO_ACCESS_KEY (default `minioadmin`)
    * MINIO_SECRET_KEY (default `minioadmin123`)
    * MINIO_PUBLIC_URL (opcionális; ha be van állítva, a presigned URL-ek erre lesznek átírva)
Auth (dev): `localhost:8888`
    * db: 5434
    * PORT (default `8888`)
    * ENABLED_URLS (default `http://localhost:3000`)
    * JWT_SECRET
    * DB_TYPE (default `postgres`)
    * DB_HOST (default `localhost`)
    * DB_PORT (default `5432`)
    * DB_USERNAME
    * DB_PASSWORD
    * DB_DATABASE
    * DEFAULT_ADMIN_EMAIL (default `admin@admin.com`)
    * DEFAULT_ADMIN_PASSWORD (default `admin123`)
    * DEFAULT_ADMIN_USERNAME (default `admin`)
    * DEFAULT_ADMIN_FIRST_NAME (default `Admin`)
    * DEFAULT_ADMIN_LAST_NAME (default `User`)

Live transcription (whisper-live containers): `localhost:8080` (nginx)
    * WHISPERLIVE_MODEL (default `tiny`)
    * WHISPERLIVE_MAX_CLIENTS (default `2`)
    * WHISPERLIVE_THREADS (default `2`)
    * WHISPERLIVE_API_KEY (üres = auth kikapcsolva)
    * WHISPERLIVE_MAX_CONNECTION_TIME (default `3600`)

Redis: 6379
MinIO: 9000, 9001
