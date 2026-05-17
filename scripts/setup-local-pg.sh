#!/usr/bin/env bash
set -euo pipefail

# [2026-02-24] Local PostgreSQL env bootstrap for divergram
export PGHOST="localhost"
export PGPORT="5432"
export PGDATABASE="divergram"
export PGUSER="postgres"

# Set your password before use
if [[ -z "${PGPASSWORD:-}" ]]; then
  echo "PGPASSWORD is empty. Set it with:" >&2
  echo "  export PGPASSWORD='your_password'" >&2
fi

echo "PGHOST=$PGHOST PGPORT=$PGPORT PGDATABASE=$PGDATABASE PGUSER=$PGUSER"
