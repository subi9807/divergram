#!/usr/bin/env bash
set -euo pipefail

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew가 필요합니다: https://brew.sh" >&2
  exit 1
fi

brew list postgresql@16 >/dev/null 2>&1 || brew install postgresql@16
brew services start postgresql@16

if ! command -v psql >/dev/null 2>&1; then
  echo "psql을 찾지 못했습니다. brew info postgresql@16 확인이 필요합니다." >&2
  exit 1
fi

createuser -s postgres >/dev/null 2>&1 || true
createdb divergram >/dev/null 2>&1 || true

echo "로컬 PostgreSQL 준비 완료"
echo "필요하면 비밀번호 설정 후 .env.server 에 반영하세요."
