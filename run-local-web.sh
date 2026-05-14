#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
npm run dev -- --host 0.0.0.0
