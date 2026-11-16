#!/usr/bin/env bash
# Daily cron: /absolute/repo/deploy/backup.sh /absolute/.env.production
set -euo pipefail
source "$(dirname "$0")/common.sh"
umask 077
BACKUP_DIR=${BACKUP_DIR:-$(config_value BACKUP_DIR)}
BACKUP_DIR=${BACKUP_DIR:-$ROOT/backups}
[[ "$BACKUP_DIR" = /* ]] || BACKUP_DIR="$ROOT/$BACKUP_DIR"
KEEP=${BACKUP_KEEP:-$(config_value BACKUP_KEEP)}; KEEP=${KEEP:-14}
[[ "$KEEP" =~ ^[1-9][0-9]*$ ]] || { echo 'BACKUP_KEEP phải là số nguyên dương' >&2; exit 1; }
mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/exam-$(date -u +%Y%m%dT%H%M%SZ)-$$.sql.gz"
trap 'rm -f "$FILE.tmp"' EXIT
"${COMPOSE[@]}" exec -T db sh -ec 'MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump -h 127.0.0.1 -u"$MYSQL_USER" --single-transaction --quick --no-tablespaces --set-gtid-purged=OFF --hex-blob "$MYSQL_DATABASE"' | gzip > "$FILE.tmp"
gzip -t "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
# Only prune files created by this script; sorted UTC timestamp names.
shopt -s nullglob
FILES=("$BACKUP_DIR"/exam-*.sql.gz)
REMOVE=$((${#FILES[@]} - KEEP))
for ((i=0;i<REMOVE;i++)); do rm -f "${FILES[i]}"; done
printf 'Đã sao lưu: %s\n' "$FILE"
