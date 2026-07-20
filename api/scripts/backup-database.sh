#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ENV_FILE="${DIVERGRAM_ENV_FILE:-/home/divergram/api/.env}"
BACKUP_DIR="${DIVERGRAM_BACKUP_DIR:-/var/backups/divergram/postgres}"
RETENTION_DAYS="${DIVERGRAM_BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOST="$(hostname -s)"
BACKUP_FILE="${BACKUP_DIR}/divergram-${HOST}-${STAMP}.dump"
TEMP_FILE="${BACKUP_FILE}.partial"
PG_DUMP="${PG_DUMP:-/usr/pgsql-14/bin/pg_dump}"
PG_RESTORE="${PG_RESTORE:-/usr/pgsql-14/bin/pg_restore}"

if [[ ! -r "$ENV_FILE" ]]; then
  echo "Cannot read environment file: $ENV_FILE" >&2
  exit 1
fi

install -d -m 0700 "$BACKUP_DIR"
trap 'rm -f "$TEMP_FILE"' EXIT
NODE_BIN="${NODE_BIN:-/root/.nvm/versions/node/v22.14.0/bin/node}"
read_env() {
  "$NODE_BIN" -e '
    const dotenv = require(process.argv[1]);
    const parsed = dotenv.config({ path: process.argv[2], quiet: true }).parsed || {};
    process.stdout.write(String(parsed[process.argv[3]] || ""));
  ' "/home/divergram/api/node_modules/dotenv/lib/main.js" "$ENV_FILE" "$1"
}

DATABASE_URL="$(read_env DATABASE_URL)"
export PGHOST="$(read_env PGHOST)"
export PGPORT="$(read_env PGPORT)"
export PGDATABASE="$(read_env PGDATABASE)"
export PGUSER="$(read_env PGUSER)"
export PGPASSWORD="$(read_env PGPASSWORD)"
PGSSLMODE="$(read_env PGSSLMODE)"
if [[ -n "$PGSSLMODE" ]]; then
  export PGSSLMODE
else
  unset PGSSLMODE
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  "$PG_DUMP" --format=custom --compress=9 --no-owner --no-acl --file="$TEMP_FILE" "$DATABASE_URL"
else
  : "${PGDATABASE:?PGDATABASE is required}"
  "$PG_DUMP" --format=custom --compress=9 --no-owner --no-acl --file="$TEMP_FILE"
fi

"$PG_RESTORE" --list "$TEMP_FILE" >/dev/null
mv "$TEMP_FILE" "$BACKUP_FILE"
sha256sum "$BACKUP_FILE" >"${BACKUP_FILE}.sha256"
chmod 0600 "$BACKUP_FILE" "${BACKUP_FILE}.sha256"

find "$BACKUP_DIR" -type f \( -name '*.dump' -o -name '*.dump.sha256' \) -mtime "+$RETENTION_DAYS" -delete

if [[ -n "${DIVERGRAM_BACKUP_REMOTE:-}" ]]; then
  if ! command -v rclone >/dev/null 2>&1; then
    echo "DIVERGRAM_BACKUP_REMOTE is set but rclone is unavailable" >&2
    exit 1
  fi
  rclone copy "$BACKUP_FILE" "$DIVERGRAM_BACKUP_REMOTE" --checksum
  rclone copy "${BACKUP_FILE}.sha256" "$DIVERGRAM_BACKUP_REMOTE" --checksum
fi

echo "Backup verified: $BACKUP_FILE"
