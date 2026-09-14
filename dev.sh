#!/usr/bin/env bash
# =============================================================================
# dev.sh — Start HangBank v2 locally (infrastructure via Docker, services native)
# Usage: ./dev.sh
# Stop:  Ctrl+C  (all child processes are killed automatically)
# =============================================================================

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()  { echo -e "${CYAN}[dev]${RESET} $*"; }
ok()   { echo -e "${GREEN}[dev]${RESET} $*"; }
warn() { echo -e "${YELLOW}[dev]${RESET} $*"; }
die()  { echo -e "${RED}[dev] ERROR:${RESET} $*" >&2; exit 1; }

# ── Config ────────────────────────────────────────────────────────────────────
POSTGRES_CONTAINER="dev_auth_local"
MINIO_CONTAINER="dev_minio_local"

POSTGRES_USER="auth_admin"
POSTGRES_PASSWORD="auth_admin"
POSTGRES_DB="auth_db"
POSTGRES_PORT="5432"

MINIO_PORT="9000"
MINIO_CONSOLE_PORT="9001"
MINIO_ROOT_USER="minioadmin"
MINIO_ROOT_PASSWORD="minioadmin"

AUTH_PORT="8888"
BACKEND_PORT="3001"
AUDIO_PORT="3002"
FRONTEND_PORT="3000"

# Collect PIDs of all background services for cleanup
PIDS=()

# ── Cleanup ───────────────────────────────────────────────────────────────────
cleanup() {
  echo ""
  warn "Shutting down services…"
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null && wait "$pid" 2>/dev/null || true
  done
  warn "Stopping infrastructure containers…"
  docker stop "$POSTGRES_CONTAINER" "$MINIO_CONTAINER" 2>/dev/null || true
  ok "All stopped. Goodbye!"
}
trap cleanup EXIT INT TERM

# ── Helpers ───────────────────────────────────────────────────────────────────
require() {
  command -v "$1" &>/dev/null || die "'$1' not found. Please install it first."
}

# Source a .env file inside the current shell scope, stripping CR and comments.
# Call inside a subshell so it doesn't pollute the parent.
load_dotenv() {
  local file="$1"
  if [[ -f "$file" ]]; then
    # tr -d '\r' handles Windows CRLF; grep filters blanks & comments
    set -a
    # shellcheck disable=SC1090
    source <(grep -v '^\s*#' "$file" | grep -v '^\s*$' | tr -d '\r')
    set +a
  fi
}

wait_for_port() {
  local name="$1" port="$2" tries=40
  log "Waiting for $name on port $port…"
  for ((i=1; i<=tries; i++)); do
    if nc -z 127.0.0.1 "$port" 2>/dev/null; then
      ok "$name is ready ✓"
      return 0
    fi
    sleep 1
  done
  die "$name did not become ready on port $port after ${tries}s"
}

# ── Pre-flight ────────────────────────────────────────────────────────────────
require docker
require node
require npm
require nc

# ── 1. PostgreSQL ─────────────────────────────────────────────────────────────
log "Starting PostgreSQL…"
if docker ps -a --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
  docker start "$POSTGRES_CONTAINER" >/dev/null
else
  docker run -d \
    --name "$POSTGRES_CONTAINER" \
    -e POSTGRES_USER="$POSTGRES_USER" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    -e POSTGRES_DB="$POSTGRES_DB" \
    -p "${POSTGRES_PORT}:5432" \
    postgres:15-alpine >/dev/null
fi
wait_for_port "PostgreSQL" "$POSTGRES_PORT"

# ── 2. MinIO ──────────────────────────────────────────────────────────────────
log "Starting MinIO…"
if docker ps -a --format '{{.Names}}' | grep -q "^${MINIO_CONTAINER}$"; then
  docker start "$MINIO_CONTAINER" >/dev/null
else
  docker run -d \
    --name "$MINIO_CONTAINER" \
    -e MINIO_ROOT_USER="$MINIO_ROOT_USER" \
    -e MINIO_ROOT_PASSWORD="$MINIO_ROOT_PASSWORD" \
    -p "${MINIO_PORT}:9000" \
    -p "${MINIO_CONSOLE_PORT}:9001" \
    minio/minio server /data --console-address ":9001" >/dev/null
fi
wait_for_port "MinIO" "$MINIO_PORT"

echo ""
echo -e "${BOLD}Infrastructure ready:${RESET}"
echo -e "  ${GREEN}●${RESET} PostgreSQL    localhost:${POSTGRES_PORT}"
echo -e "  ${GREEN}●${RESET} MinIO API     http://localhost:${MINIO_PORT}"
echo -e "  ${GREEN}●${RESET} MinIO Console http://localhost:${MINIO_CONSOLE_PORT}  (${MINIO_ROOT_USER} / ${MINIO_ROOT_PASSWORD})"
echo ""

# ── 3. Auth Service ───────────────────────────────────────────────────────────
log "Starting auth-service on :${AUTH_PORT}…"
(
  load_dotenv "$ROOT/auth/.env"
  export DB_TYPE=postgres
  export DB_HOST=127.0.0.1
  export DB_PORT="$POSTGRES_PORT"
  export DB_USERNAME="$POSTGRES_USER"
  export DB_PASSWORD="$POSTGRES_PASSWORD"
  export DB_DATABASE="$POSTGRES_DB"
  export PORT="$AUTH_PORT"
  cd "$ROOT/auth"
  exec npm run start:dev
) &
PIDS+=($!)
wait_for_port "auth-service" "$AUTH_PORT"

# ── 4. HangBank Backend ───────────────────────────────────────────────────────
log "Starting hangbank-backend on :${BACKEND_PORT}…"
(
  load_dotenv "$ROOT/hangbank_backend/.env"
  export AUTH_SERVICE_URL="http://localhost:${AUTH_PORT}"
  export ENABLED_URLS="http://localhost:${FRONTEND_PORT}"
  export PORT="$BACKEND_PORT"
  cd "$ROOT/hangbank_backend"
  exec npm run start:dev
) &
PIDS+=($!)
wait_for_port "hangbank-backend" "$BACKEND_PORT"

# ── 5. Audio Quality Checker ──────────────────────────────────────────────────
log "Starting audio-quality-checker on :${AUDIO_PORT}…"
(
  export PORT="$AUDIO_PORT"
  cd "$ROOT/audio-quality-checker"
  exec npm run start:dev
) &
PIDS+=($!)
wait_for_port "audio-quality-checker" "$AUDIO_PORT"

# ── 6. Frontend ───────────────────────────────────────────────────────────────
log "Starting hangbank-frontend on :${FRONTEND_PORT}…"
(
  export NEXT_PUBLIC_BACKEND_URL="http://localhost:${BACKEND_PORT}"
  export PORT="$FRONTEND_PORT"
  cd "$ROOT/hangbank_frontend"
  exec npm run dev
) &
PIDS+=($!)
wait_for_port "hangbank-frontend" "$FRONTEND_PORT"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║       HangBank v2 — all systems go  🎵       ║${RESET}"
echo -e "${BOLD}╠══════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}║${RESET}  Frontend        http://localhost:${FRONTEND_PORT}       ${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  Backend         http://localhost:${BACKEND_PORT}       ${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  Auth service    http://localhost:${AUTH_PORT}       ${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  Audio checker   http://localhost:${AUDIO_PORT}       ${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  MinIO Console   http://localhost:${MINIO_CONSOLE_PORT}       ${BOLD}║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${RESET} to stop everything."
echo ""

# Wait — if any service exits unexpectedly, exit the whole script (triggers cleanup)
wait -n 2>/dev/null || wait
