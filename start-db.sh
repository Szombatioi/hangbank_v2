#!/usr/bin/env bash
# start-db.sh — Start the local PostgreSQL container for HangBank v2
# Usage: ./start-db.sh
set -e

CONTAINER="dev_auth_local"
POSTGRES_USER="auth_admin"
POSTGRES_PASSWORD="auth_admin"
POSTGRES_DB="auth_db"
POSTGRES_PORT="5432"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'
log()  { echo -e "${CYAN}[db]${RESET} $*"; }
ok()   { echo -e "${GREEN}[db]${RESET} $*"; }
warn() { echo -e "${YELLOW}[db]${RESET} $*"; }

# ── Start or create container ─────────────────────────────────────────────────
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  ok "Container '${CONTAINER}' is already running."
elif docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  log "Starting existing container '${CONTAINER}'…"
  docker start "$CONTAINER" > /dev/null
else
  log "Creating and starting container '${CONTAINER}'…"
  docker run -d \
    --name "$CONTAINER" \
    -e POSTGRES_USER="$POSTGRES_USER" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    -e POSTGRES_DB="$POSTGRES_DB" \
    -p "${POSTGRES_PORT}:5432" \
    postgres:15-alpine > /dev/null
fi

# ── Wait for Postgres to be ready ─────────────────────────────────────────────
log "Waiting for PostgreSQL to be ready…"
for i in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U "$POSTGRES_USER" -q 2>/dev/null; then
    break
  fi
  sleep 1
done
docker exec "$CONTAINER" pg_isready -U "$POSTGRES_USER" -q || { echo "PostgreSQL did not become ready."; exit 1; }
ok "PostgreSQL is ready on localhost:${POSTGRES_PORT}"

# ── Ensure hangbank_db exists ─────────────────────────────────────────────────
if docker exec "$CONTAINER" psql -U "$POSTGRES_USER" -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "hangbank_db"; then
  ok "Database 'hangbank_db' already exists."
else
  log "Creating database 'hangbank_db'…"
  docker exec "$CONTAINER" psql -U "$POSTGRES_USER" -c "CREATE DATABASE hangbank_db;" > /dev/null
  ok "Database 'hangbank_db' created."
fi

echo ""
echo -e "  ${GREEN}●${RESET} PostgreSQL   localhost:${POSTGRES_PORT}"
echo -e "  ${GREEN}●${RESET} Databases    ${POSTGRES_DB}, hangbank_db"
echo -e "  ${GREEN}●${RESET} User         ${POSTGRES_USER} / ${POSTGRES_PASSWORD}"
echo ""
