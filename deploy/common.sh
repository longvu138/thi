#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ENV_FILE=${1:?Usage: script ENV_FILE ...}
ENV_FILE=$(cd "$(dirname "$ENV_FILE")" && pwd)/$(basename "$ENV_FILE")
[[ -f "$ENV_FILE" ]] || { echo 'Không tìm thấy cấu hình' >&2; exit 1; }
COMPOSE=(docker compose --project-directory "$ROOT" --env-file "$ENV_FILE" -f "$ROOT/compose.yaml")
valid_database() { [[ "$1" =~ ^[A-Za-z0-9_]+$ && "$1" != mysql && "$1" != sys && "$1" != performance_schema && "$1" != information_schema ]]; }
config_value() { awk -v key="$1" 'index($0,key"=")==1 {sub(/^[^=]*=/,"");sub(/\r$/,"");print;exit}' "$ENV_FILE"; }
