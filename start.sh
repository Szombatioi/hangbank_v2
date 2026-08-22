#!/usr/bin/env bash
#Starting all services & containers for dev testing

set -e

BACKEND_DIR="./hangbank_backend"
FRONTEND_DIR="./hangbank_frontend"
AQC_DIR="./audio-quality-checker"


cleanup(){
    echo "Cleaning up services..."
    if [ -n "$(jobs -pr)" ]; then
        kill $(jobs -pr) 2>/dev/null || true
    fi

    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo "Starting services..."
(cd "$BACKEND_DIR" && npm run start:dev) &
(cd "$FRONTEND_DIR" && npm run dev) &
(cd "$AQC_DIR" && npm run start:dev) &

wait