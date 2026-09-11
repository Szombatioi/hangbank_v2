#!/usr/bin/env bash
#Starting all services & containers for dev testing

set -e

BACKEND_DIR="./hangbank_backend" #DB: 5433
FRONTEND_DIR="./hangbank_frontend"
AQC_DIR="./audio-quality-checker"
AUTH_DIR="./auth" #DB: 5434
S3_DIR="./s3-storage-manager" #Minio: 9000


cleanup(){
    echo "Cleaning up services..."
    if [ -n "$(jobs -pr)" ]; then
        kill $(jobs -pr) 2>/dev/null || true
    fi

    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo "Starting backend"
(cd "$BACKEND_DIR" && npm run start:dev) &
echo "Starting frontend"
(cd "$FRONTEND_DIR" && npm run dev) &
echo "Starting aqc"
(cd "$AQC_DIR" && npm run start:dev) &
echo "Starting auth"
(cd "$AUTH_DIR" && npm run start:dev) &
echo "Starting s3 manager"
(cd "$S3_DIR" && npm run start:dev) &

wait