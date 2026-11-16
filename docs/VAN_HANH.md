# Vận hành hệ thống kiểm tra nhận thức

Phạm vi một Backend, MySQL 8.4 và Caddy; chưa có Redis/cụm nhiều máy. Mốc tham khảo 1000 người: 4 vCPU, RAM 8 GB, SSD ≥80 GB, mạng ≥50 Mbps. Đây là cấu hình khởi điểm, phải đo trên máy đích trước ngày thi.

## Cài mới

1. Cài Docker Engine + Compose; checkout source đúng phiên bản. Không sao chép `.env` local lên server.
2. `cp .env.production.example .env.production && chmod 600 .env.production`. Điền bốn giá trị riêng `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `JWT_SECRET`, `CSRF_SECRET`, mỗi giá trị tạo bằng `openssl rand -hex 32`. Giữ an toàn file này, không commit, không gửi nội dung `docker compose config` công khai vì có secret.
3. Domain: đặt `SITE_ADDRESS=kiemtra.example.org`, `PUBLIC_ORIGIN=https://kiemtra.example.org`, `ACME_EMAIL` của quản trị, `AUTH_COOKIE_SECURE=true`. DNS A/AAAA trỏ đúng máy; mở 80/443. Caddy xin/gia hạn HTTPS tự động, volume chứng chỉ phải được giữ.
4. Nội bộ HTTP: `SITE_ADDRESS=:80`, `PUBLIC_ORIGIN=http://IP_MAY_CHU`, chọn cổng nếu khác 80; `AUTH_COOKIE_SECURE=false`, `ALLOW_INSECURE_HTTP=true` chỉ khi chấp nhận HTTP trong LAN. HTTP không mã hóa dữ liệu/cookie. HTTPS vẫn được khuyến nghị. Không dùng localhost trong QR phát cho điện thoại.
5. Chạy từ root source:

```bash
docker compose --env-file .env.production config --quiet
docker compose --env-file .env.production up -d --build --wait
docker compose --env-file .env.production exec backend pnpm create-admin
```

CLI hỏi tài khoản/họ tên/mật khẩu ẩn, không có tài khoản mặc định. DB không publish cổng. Luồng khởi động: DB khỏe → migrate thành công → Backend khỏe → web. Chỉ chạy **một Backend** vì rate limit và job đang ở bộ nhớ một tiến trình. Không scale Backend.

Dữ liệu nằm trong named volume theo `COMPOSE_PROJECT_NAME`: MySQL, log, cấu hình hỗ trợ và chứng chỉ. **Không đổi project name, không `down -v`** với hệ thống có dữ liệu. Không chỉnh sửa migration đã chạy khi có dữ liệu thật; triển khai thay đổi schema bằng migration mới.

## Kết nối, IP và giới hạn

- Caddy là proxy duy nhất; `TRUST_PROXY=1`, chỉ public web. Không publish Backend, không thêm proxy/CDN mà chưa điều chỉnh trust. Caddy ghi lại X-Forwarded-For từ địa chỉ kết nối, bỏ giá trị giả mạo từ client.
- Toàn API: 30000 request/IP/15 phút. Người đã xác thực: dùng chung quota 600/user/15 phút cho đợt/lượt/kết quả/phiếu. Vào thi: 3000/IP/15 phút. Đăng nhập Admin: 10 lỗi/IP+tài khoản và 50 lỗi/IP/15 phút; tra cứu phiếu công khai 30/IP/15 phút. Giá trị và cửa sổ thời gian cấu hình bằng các biến *_RATE_LIMIT_* trong file mẫu.
- Mỗi 429 có event riêng, requestId, user (nếu đã xác thực) và IP trong audit log. Kiểm tra 429 trước khi tăng quota; không tắt bảo vệ đăng nhập/tra cứu để xử lý tải thi.
- Pool production 20, dev 3, cho phép 1..50. MySQL mặc định `max_connections=150`; chừa cho migrate/backup/quản trị. Tăng pool không thay thế việc đo tải, CPU, RAM và truy vấn chậm.
- Job chốt mỗi 10 giây trong Compose; lặp lô 100 tới hết hoặc hết ngân sách 20 giây. Không chạy chồng, stop đợi lô đang xử lý. Giới hạn thời gian kiểm giữa các lô, không hủy transaction đang chấm. Độ trễ thật cần đo trên máy đích.

## Hướng dẫn phát cho người dự thi

Admin vào **Hướng dẫn dự thi**, nhập đầu mối hỗ trợ rồi Lưu, in A4 hoặc phát đường dẫn `/guide`. Nội dung công khai không chứa secret. QR lấy origin website hoặc `VITE_PUBLIC_APP_URL` ở lúc build. Cấu hình hỗ trợ lưu tại `/app/storage/settings.json` trong volume riêng, không cần migration. Sao lưu cả volume này khi di chuyển máy.

## Sao lưu và diễn tập khôi phục

Chạy từ bất cứ thư mục nào, dùng đường dẫn tuyệt đối cho cron:

```bash
/absolute/repo/deploy/backup.sh /absolute/repo/.env.production
# Cron hằng ngày 02:00 (giờ của hệ điều hành):
# 0 2 * * * /absolute/repo/deploy/backup.sh /absolute/repo/.env.production >> /secure/path/backup.log 2>&1
```

Script dùng mysqldump `--single-transaction --quick`, nén gzip, kiểm nén trước khi đổi tên chính thức, chỉ xóa bản `exam-*.sql.gz` cũ sau khi dump thành công. `BACKUP_KEEP` mặc định 14. `BACKUP_DIR` tương đối tính từ root source. Không đổi schema khi dump. File sao lưu chứa dữ liệu cá nhân, quyền file 600; giới hạn người truy cập.

Sao chép định kỳ ra máy khác qua kênh bảo mật (`scp`/ổ đĩa mã hóa); checksum bằng `sha256sum` hoặc `shasum -a 256` trước/sau sao chép. Sao lưu riêng `.env.production`, volume cấu hình hỗ trợ, và chứng chỉ Caddy; SQL không chứa các file này.

```bash
# Luôn diễn tập vào DB khác trước, script dùng root trong container hiện tại:
./deploy/restore.sh .env.production /secure/path/exam-....sql.gz exam_restore_drill
# Script hỏi nhập chính xác exam_restore_drill; từ chối DB đã có bảng.
```

Đối chiếu `COUNT(*)` **từng bảng**, gồm users, attempts, attempt_questions, attempt_answers, attempt_receipts, auth_sessions, questions; không dùng information_schema.TABLE_ROWS (ước lượng InnoDB). Kiểm tra thêm nội dung mẫu, kết quả và snapshot. DB diễn tập không tự được cấp cho tài khoản ứng dụng; chỉ quản trị dùng root để kiểm.

Khôi phục DB thật: dừng web và Backend, backup hiện trạng, xác nhận file/schema/phiên bản đúng. Chỉ khi có chủ đích truyền `--allow-overwrite`; script vẫn hỏi nhập tên đích. **Ghi đè xóa DB đích và không có rollback tự động**; gzip kiểm được file nén, không bảo đảm mọi câu SQL hợp lệ. Nếu import lỗi, giữ hệ thống dừng và khôi phục bản đã kiểm. Không restore trong khi người dùng đang thi. Không đưa password vào tham số mysql hay shell history.

## Thử tải cách ly

Không bật load test trên DB thật. Dùng project/volume riêng với `MYSQL_DATABASE=exam_load_test_<ten>`, `APP_ENV=development`, `LOAD_TEST_ENABLED=true`, cổng web khác, bind 127.0.0.1; secret ngẫu nhiên riêng. Đây là ngoại lệ môi trường kiểm tra đã được giao ở giai đoạn 13, không đổi backend/.env dev. Tạo đợt tên `E2E_ROUND_...`, OPEN, đang trong cửa sổ chạy thử; start chính thức phải sau lúc kết thúc kịch bản ít nhất 1 phút, thời lượng lượt đủ dài, maxAttempts ≥1. Import câu/cơ cấu rồi mở đợt bằng Admin.

```bash
# Chạy runner ngay trong container Backend (kết nối đúng DB Docker, qua proxy web):
docker compose --env-file .env.load exec -T \
  -e TEST_LOAD_DB_NAME=exam_load_test_local backend \
  node scripts/load-test.js --round-id UUID --base-url http://web/api
# Tương đương pnpm load-test --round-id UUID khi chạy Node local trên DB test cấu hình riêng.
# Máy yếu: 100 người, tăng 5s, gửi 5s/lô, nộp trong 5s cuối của 20s:
docker compose --env-file .env.load exec -T \
  -e TEST_LOAD_DB_NAME=exam_load_test_local backend \
  node scripts/load-test.js --round-id UUID --total 100 --concurrency 100 \
  --ramp-seconds 5 --duration-seconds 20 --submit-window-seconds 5 --batch-seconds 5 --base-url http://web/api
```

Mặc định: 1000 user/session riêng, tăng 300s, tổng 600s, nộp trong 120s cuối, batch và GET trạng thái 30s; 100 người/IP mô phỏng qua header chỉ được chấp nhận sau handshake DB thử. Hai start cạnh tranh kiểm cùng một lượt. Gửi lô chỉ câu đổi, lô lỗi gửi bù; nộp toàn bộ. Báo p50/p95/p99 và lỗi mã 429/5xx, số lượt vượt giới hạn/IN_PROGRESS kép/lượt không thử phải 0. Exit 0 khi đủ người hoàn tất, lỗi request <0,5%, p95 lưu <1000ms, p95 nộp <3000ms và không vi phạm. Các request thất bại vẫn tính vào số liệu.

Runner mặc định đo API loopback; lệnh trên dùng `http://web/api` qua Caddy (chỉ cho phép hostname web khi DB_HOST=db và LOAD_TEST_ENABLED=true). Cả hai chưa chứng minh sức chịu tải TLS/mạng điện thoại. Phải kiểm thêm qua địa chỉ web thực tế và thiết bị thực trước ngày thi. Kết quả trên laptop/nhịp rút gọn không phải cam kết 1000 người trên máy chủ. Không mở DB ra Internet để chạy runner. Header giả lập không có tác dụng trên server production. Hết thử: xuất báo cáo số liệu, dùng API xóa lượt thử có audit; user E2E vẫn giữ để đối chiếu hoặc bỏ toàn bộ project QA đã xác nhận. Không xóa dữ liệu trên project thật.

## Checklist theo mốc

- Trước 7 ngày: cấu hình DNS/HTTPS, mở đúng cổng, kiểm đồng hồ NTP, dung lượng, backup ngoài máy và restore diễn tập; chạy đủ tải 1000 trên máy chủ đích, xử lý nếu không đạt ngưỡng.
- Trước 1 ngày: kiểm nội dung/cơ cấu/số câu/thời gian/lượt, hướng dẫn và đầu mối; làm lượt thử trên điện thoại, in phiếu, tra cứu mã. Backup trước/sau diễn tập, xóa lượt thử bằng API có audit.
- Trước 1 giờ: kiểm `docker compose ps`, `/api/health`, HTTPS, thời gian, 429/5xx, CPU/RAM/ổ đĩa; backup, chốt cấu hình. Không deploy lúc thi.
- Trong thi: trực hỗ trợ, theo dõi log/health, tài nguyên và hàng đợi chốt; không reset/restart/migrate tùy tiện. Mất mạng người dùng cần giữ tab, chờ kết quả khi nộp.
- Sau thi: đóng đợt, chờ lượt chốt, xuất Excel/đối chiếu, backup và sao chép ngoài máy; kiểm restore định kỳ, giới hạn quyền truy cập dữ liệu cá nhân.

## Cập nhật và sự cố

Backup trước; build/pull phiên bản đã kiểm, khởi động migrate và Backend theo Compose, kiểm health rồi mới phục vụ. `docker compose restart` không cập nhật image/env, cần `up -d` sau build/pull. Nếu migrate thất bại, Backend không được khởi động mới; đọc log, không rollback mù trên dữ liệu thật. `docker compose logs --since 10m backend` chứa dữ liệu vận hành cần bảo mật. Secret giữ nguyên khi cập nhật, đổi có kế hoạch sẽ làm phiên hiện tại mất hiệu lực. Công cụ `backend/scripts/setup-deploy.js` và tài liệu DEPLOY_VPS_DOCKER cũ đã lỗi thời.

Smoke API tự động tùy chọn trong **stack QA riêng đã bật LOAD_TEST_ENABLED**, không dùng production: `docker compose --env-file .env.load exec -T backend node scripts/deploy-smoke.js`. Script xác minh tên DB/handshake trước khi tạo admin ngẫu nhiên và dữ liệu E2E, tạo cả một đợt chính thức giả và một đợt chạy thử, kiểm start/lưu/nộp/kết quả/phiếu/idempotent/giới hạn lượt và quyền cấu hình. Nó không in mật khẩu, ghi UUID fixture tại `/tmp/stage13-fixture.json` trong container. Đây là API smoke, không thay thế thử UI/in/scan QR thủ công.
