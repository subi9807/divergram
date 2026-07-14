#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_DIR="${DIVERGRAM_BACKUP_DIR:-/var/backups/divergram/postgres}"
PG_RESTORE="${PG_RESTORE:-/usr/pgsql-14/bin/pg_restore}"
LATEST="$(find "$BACKUP_DIR" -type f -name '*.dump' -print0 2>/dev/null | xargs -0 ls -1t 2>/dev/null | head -1)"

if [[ -z "$LATEST" ]]; then
  echo "No database backup found in $BACKUP_DIR" >&2
  exit 1
fi

test -s "$LATEST"
test -f "${LATEST}.sha256"
(cd "$(dirname "$LATEST")" && sha256sum --check "$(basename "${LATEST}.sha256")")
"$PG_RESTORE" --list "$LATEST" >/dev/null
echo "Latest backup is valid: $LATEST"
