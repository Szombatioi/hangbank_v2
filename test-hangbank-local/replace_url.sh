#!/usr/bin/env bash
set -euo pipefail

if [ $# -eq 0 ]; then
    echo "Usage: $0 <replacement_string>" >&2
    exit 1
fi

OLD_VALUE="$1"
NEW_VALUE="$2"

BACKEND_DIR="./hangbank_backend"
FRONTEND_DIR="./hangbank_frontend"
AUTH_DIR="./auth"


(cd "$BACKEND_DIR" && sed -i "s|${OLD_VALUE}|${NEW_VALUE}|g" ".env") &
(cd "$FRONTEND_DIR" && sed -i "s|${OLD_VALUE}|${NEW_VALUE}|g" ".env") &
(cd "$AUTH_DIR" && sed -i "s|${OLD_VALUE}|${NEW_VALUE}|g" ".env") &