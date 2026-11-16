#!/usr/bin/env bash
# restore.sh ENV_FILE FILE.sql.gz TARGET_DB [--allow-overwrite]
set -euo pipefail
source "$(dirname "$0")/common.sh"
FILE=${2:?Cần file sql.gz}; TARGET=${3:?Cần database đích}; FLAG=${4:-}
[[ $# -le 4 && ( -z "$FLAG" || "$FLAG" = --allow-overwrite ) ]] || { echo 'Tham số không hợp lệ' >&2; exit 1; }
valid_database "$TARGET" || { echo 'Tên database đích không hợp lệ' >&2; exit 1; }
[[ -f "$FILE" ]] || { echo 'Không tìm thấy bản sao lưu' >&2; exit 1; }
gzip -t "$FILE"
TABLES=$("${COMPOSE[@]}" exec -T -e TARGET_DB="$TARGET" db sh -ec 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot -Nse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\"$TARGET_DB\""' < /dev/null)
[[ "$TABLES" = 0 || "$FLAG" = --allow-overwrite ]] || { echo 'Database có bảng/dữ liệu. Từ chối; chỉ ghi đè với --allow-overwrite.' >&2; exit 1; }
printf 'Khôi phục vào %s, dữ liệu đích sẽ bị thay thế. Nhập đúng tên database để xác nhận: ' "$TARGET" >&2
read -r CONFIRM
[[ "$CONFIRM" = "$TARGET" ]] || { echo 'Đã hủy' >&2; exit 1; }
"${COMPOSE[@]}" exec -T -e TARGET_DB="$TARGET" db sh -ec 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot -e "DROP DATABASE IF EXISTS \`$TARGET_DB\`; CREATE DATABASE \`$TARGET_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"' < /dev/null
gzip -dc "$FILE" | "${COMPOSE[@]}" exec -T -e TARGET_DB="$TARGET" db sh -ec 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot "$TARGET_DB"'
printf 'Đã khôi phục vào %s. Đối chiếu số dòng trước khi sử dụng.\n' "$TARGET"
