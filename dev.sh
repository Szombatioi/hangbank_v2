#!/usr/bin/env bash
# =============================================================================
# dev.sh — Start HangBank v2 locally (infrastructure via Docker, services native)
# Usage: ./dev.sh
# Stop:  Ctrl+C  (all child processes are killed automatically)
# =============================================================================

set -euo pipefail

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

AUTH_SERVICE_PORT="8888"
BACKEND_PORT="3001"
AUDIO_CHECKER_PORT="3002"
FRONTEND_PORT="3000"

# Collect PIDs of all background services for cleanup
PIDS=()

# ── Cleanup ───────────────────────────────────────────────────────────────────
cleanup() {
  echo ""
  warn "Shutting down services…"
  for pid in "${PIDS[@]}"; do
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

wait_for_port() {
  local name="$1" port="$2" tries=30
  log "Waiting for $name on port $port…"
  for ((i=1; i<=tries; i++)); do
    if nc -z 127.0.0.1 "$port" 2>/dev/null; then
      ok "$name is ready"
      return 0
    fi
    sleep 1
  done
  die "$name did not become ready on port $port after ${tries}s"
}

run_service() {
  # run_service <label> <dir> <cmd> [env_pairs...]
  local label="$1" dir="$2"; shift 2
  local cmd=("$@")
  log "Starting ${BOLD}$label${RESET}…"
  (
    cd "$ROOT/$dir"
    exec "${cmd[@]}"
  ) &
  PIDS+=($!)
  ok "$label started (PID ${PIDS[-1]})"
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
echo -e "  ${GREEN}●${RESET} PostgreSQL   → localhost:${POSTGRES_PORT}"
echo -e "  ${GREEN}●${RESET} MinIO API    → http://localhost:${MINIO_PORT}"
echo -e "  ${GREEN}●${RESET} MinIO Console→ http://localhost:${MINIO_CONSOLE_PORT}  (${MINIO_ROOT_USER} / ${MINIO_ROOT_PASSWORD})"
echo ""

# ── 3. Auth Service ───────────────────────────────────────────────────────────
# Load its own .env then override DB host to localhost
AUTH_ENV=$(grep -v '^#' "$ROOT/auth/.env" 2>/dev/null | xargs) || AUTH_ENV=""

env \
  $AUTH_ENV \
  DB_TYPE=postgres \
  DB_HOST=127.0.0.1 \
  DB_PORT="$POSTGRES_PORT" \
  DB_USERNAME="$POSTGRES_USER" \
  DB_PASSWORD="$POSTGRES_PASSWORD" \
  DB_DATABASE="$POSTGRES_DB" \
  PORT="$AUTH_SERVICE_PORT" \
  bash -c "cd '$ROOT/auth' && npm run start:dev" &
PIDS+=($!)
ok "auth-service started (PID ${PIDS[-1]})"
wait_for_port "auth-service" "$AUTH_SERVICE_PORT"

# ── 4. HangBank Backend ───────────────────────────────────────────────────────
BACKEND_ENV=$(grep -v '^#' "$ROOT/hangbank_backend/.env" 2>/dev/null | xargs) || BACKEND_ENV=""

env \
  $BACKEND_ENV \
  AUTH_SERVICE_URL="http://localhost:${AUTH_SERVICE_PORT}" \
  ENABLED_URLS="http://localhost:${FRONTEND_PORT}" \
  PORT="$BACKEND_PORT" \
  bash -c "cd '$ROOT/hangbank_backend' && npm run start:dev" &
PIDS+=($!)
ok "hangbank-backend started (PID ${PIDS[-1]})"
wait_for_port "hangbank-backend" "$BACKEND_PORT"

# ── 5. Audio Quality Checker ──────────────────────────────────────────────────
env \
  PORT="$AUDIO_CHECKER_PORT" \
  bash -c "cd '$ROOT/audio-quality-checker' && npm run start:dev" &
PIDS+=($!)
ok "audio-quality-checker started (PID ${PIDS[-1]})"
wait_for_port "audio-quality-checker" "$AUDIO_CHECKER_PORT"

# ── 6. Frontend ───────────────────────────────────────────────────────────────
env \
  NEXT_PUBLIC_BACKEND_URL="http://localhost:${BACKEND_PORT}" \
  PORT="$FRONTEND_PORT" \
  bash -c "cd '$ROOT/hangbank_frontend' && npm run dev" &
PIDS+=($!)
ok "hangbank-frontend started (PID ${PIDS[-1]})"
wait_for_port "hangbank-frontend" "$FRONTEND_PORT"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║        HangBank v2 — all systems go          ║${RESET}"
echo -e "${BOLD}╠══════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}║${RESET}  Frontend          http://localhost:${FRONTEND_PORT}       ${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  Backend           http://localhost:${BACKEND_PORT}       ${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  Auth service      http://localhost:${AUTH_SERVICE_PORT}       ${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  Audio checker     http://localhost:${AUDIO_CHECKER_PORT}       ${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  MinIO Console     http://localhost:${MINIO_CONSOLE_PORT}       ${BOLD}║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${RESET} to stop everything."
echo ""

# Keep the script alive — wait for any child to exit unexpectedly
wait -n 2>/dev/null || wait
