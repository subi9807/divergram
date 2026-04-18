#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -f .env.server ] && [ -f .env.server.local ]; then
  cp .env.server.local .env.server
fi
npm run api
