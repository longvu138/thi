# Giai đoạn 13 — kết quả triển khai và kiểm tra

Ngày 14/11/2026 (Asia/Ho_Chi_Minh). Chỉ phạm vi PLAN mục 14/giai đoạn 13 và mục 15. Không đổi chấm điểm, giới hạn lượt, chạy thử hoặc snapshot. Không có migration mới. Không sửa backend/.env hoặc frontend/.env; không truy cập DB dev/thật trong lần kiểm tra này.

## Thay đổi

- Rate limit dùng chung theo user đã authenticate cho đợt/lượt/kết quả/phiếu, mặc định 600/15 phút; IP toàn API 30000, vào thi 3000; giữ chặt login Admin và tra cứu công khai. Tất cả quota/window có env; 429 có audit log. TRUST_PROXY=1 với Caddy duy nhất và không publish API/DB.
- Pool dev mặc định 3, production 20, giới hạn 1..50, xử lý env không hợp lệ bằng mặc định.
- Job expiry lặp lô 100, chống chồng, ngân sách giữa các lô; chọn lượt hết cả grace để không bị kẹt bởi lượt chưa tới hạn. Không đổi transaction chấm/chốt.
- Compose build source hiện tại; MySQL 8.4/utf8mb4/healthcheck/named volume → migrate → Backend → Caddy + frontend. Production secrets không có giá trị mặc định, kiểm cấu hình bảo mật giữ nguyên; HTTP LAN chỉ được phép với ngoại lệ rõ ràng, tài liệu ưu tiên HTTPS.
- Backup nén/kiểm gzip/retention N; restore xác nhận tên, từ chối DB có bảng trừ khi có --allow-overwrite. Đã sửa lỗi lệnh Docker đọc mất stdin xác nhận và thêm test hồi quy.
- Load runner default 1000 user/session riêng, ramp 300s, batch và GET 30s, nộp trong 120s cuối của 600s; nhóm 100/IP sau handshake an toàn trên DB thử. Báo p50/p95/p99, lỗi, bất biến, ngưỡng và exit code.
- Hướng dẫn public /guide, Admin /admin/guide nhập đầu mối, in A4 kèm QR. Lưu cấu hình atomic JSON trong volume riêng, không tạo bảng hoặc chứa secret. Auth/me 401 không ép người chưa có phiên rời trang hướng dẫn.
- Loại cấu hình triển khai cũ; setup-deploy và DEPLOY_VPS_DOCKER được ghi rõ đã lỗi thời/vô hiệu hóa.

## File liên quan

Backend: `src/middlewares/rate-limit.middleware.js`, các route exam-rounds/attempts/results/receipts, `src/middlewares/load-test-guard.js`, `knexfile.js`, `src/modules/attempts/attempts.job.js` và truy vấn expireBatch trong service, `src/config/security.js`, module `src/modules/settings/`, `src/app/routes.js`, scripts load-test/deploy-smoke/setup-deploy, `.env.example`, cURL guide/rate-limit và test tương ứng.

Frontend: GuidePage + guide.css, guideApi/useGuide, AppRoutes/navigation/navIcons, link LoginPage, authRouting/httpClient và test. Không thay giao diện làm bài.

Triển khai/tài liệu: compose.yaml/compose.build.yaml, Dockerfile Backend/Frontend, deploy/Caddyfile/common.sh/backup.sh/restore.sh, .env.production.example, .gitignore, README ba phạm vi, docs/UI_REFERENCE, VAN_HANH, DEPLOY_VPS_DOCKER, báo cáo này và STAGE13_LOAD_LOCAL.json.

## Kiểm tra

| Kiểm tra | Kết quả | Bằng chứng/phạm vi |
|---|---|---|
| Backend unit/HTTP, không chạy integration cũ | PASS | 99 test; gồm user/IP quota/429 log, pool, job 1000 lượt giả lập/giới hạn thời gian, load schedule/guard, settings và hồi quy cũ |
| Frontend unit | PASS | 79 test; thêm trường hợp hướng dẫn public/401 |
| Frontend lint/build | PASS | Không mở browser |
| Compose config, deploy test | PASS | 3 test; dependency chain, volume, ports, cấu hình mới, shell syntax và restore stdin |
| Docker build + migrate + stack health | PASS | Project exam_s13_qa, DB exam_load_test_stage13, volume và secret riêng; MySQL/Backend/web healthy, migrate exit 0 |
| Cấu hình production trong QA | PASS | Sau tải đã chuyển QA sang production, cookie Secure, tắt load test; health qua Caddy HTTP 200; Caddy validate PASS |
| API end-to-end qua Caddy | PASS | Tạo admin; tạo đợt/câu/cơ cấu/mở; lượt chính thức giả E2E start/lưu/nộp/kết quả/phiếu; submit lại bất biến; chặn vượt lượt; không lộ đáp án trong đề |
| Cấu hình hỗ trợ | PASS | ADMIN lưu/đọc, thiếu phiên 401, USER 403, dữ liệu sai 422 |
| Backup → restore DB khác | PASS | Gzip tốt; khôi phục exam_restore_stage13; đủ 10 bảng, COUNT(*) từng bảng khớp; từ chối ghi đè không có cờ; có cờ vẫn xác nhận tên |
| Retention backup | PASS | BACKUP_KEEP=1 còn đúng 1 bản trong thư mục /tmp QA |
| Thử tải local 100 user | PASS | 100/100 hoàn tất; 800 requests; 0 lỗi, 0 429, 0 5xx; vượt lượt/IN_PROGRESS kép/lượt không thử đều 0 |
| Tải đủ 1000, ramp 5 phút/nhịp thật trên máy chủ đích | SKIP | Chưa có máy chủ đích; local chỉ chạy profile rút gọn 100 user |
| 1000 lượt tự chốt trong ≤1 phút trên DB thực tế | SKIP | Đã test logic lặp; chưa đo thời gian 1000 transaction trên máy chủ đích |
| UI desktop/tablet/mobile, dark mode, in/scan QR, E2E UI | SKIP | Theo chỉ đạo không mở browser; API smoke không thay thế UI |
| HTTPS tên miền thật, cron chạy theo ngày, backup ra máy khác | SKIP | Chưa có domain/máy chủ/đích sao lưu; script đã chạy tay trên QA |
| Integration cũ dựng/xóa schema | SKIP | Không chạy vào DB dev hoặc thật; đã kiểm API trên Compose QA riêng được giao ở giai đoạn này |

Đối chiếu restore: attempts=101; attempt_questions=1010; attempt_answers=1010; attempt_receipts=101; users=102; auth_sessions=102; questions=20; exam_rounds=2; knex_migrations=4; knex_migrations_lock=1. Hai DB giống nhau tại thời điểm so sánh.

## Tải local

Docker Desktop được cấp 8 CPU và 8.215.117.824 byte RAM. Fixture 10 câu/đề, 3 phương án; 100 user, concurrency 100, ramp 5s, tổng 20s, batch 5s, nộp trong 5s cuối, tất cả chung 1 IP mô phỏng. Qua Caddy HTTP trong mạng Docker, không đo TLS/Internet/điện thoại thật.

| Endpoint | p50 | p95 | p99 |
|---|---:|---:|---:|
| Lưu đáp án (200 request) | 8,79 ms | 18,26 ms | 33,93 ms |
| Nộp bài (100 request) | 11,78 ms | 16,46 ms | 25,17 ms |

Đạt ngưỡng của **profile local này**; không suy ra đủ sức cho 1000 người, 50 câu/đề hay máy chủ cấu hình khác. JSON số liệu: STAGE13_LOAD_LOCAL.json. Trước ngày thi bắt buộc chạy profile chuẩn trên máy chủ đích với đề và kích thước dữ liệu thực tế.

## Cách chạy thử

Theo docs/VAN_HANH.md: điền .env.production riêng, `docker compose --env-file .env.production config --quiet`, `up -d --build --wait`, `exec backend pnpm create-admin`. Không dùng cấu hình QA/secret đã tạo trong phiên này cho server thật.

Người dùng tự thử /guide, Admin lưu đầu mối, in A4/scan QR trên domain/IP thật; thử một lượt qua UI đến kết quả và in phiếu. Diễn tập backup/restore vào DB khác, so COUNT(*) từng bảng. Thử tải chỉ trên project QA, DB exam_load_test_* và cửa sổ chạy thử theo tài liệu; không bật LOAD_TEST_ENABLED trên server thi thật.

## Đối chiếu yêu cầu và phần còn chặn đưa vào thi thật

| Yêu cầu | Trạng thái |
|---|---|
| Rate limit user/IP, env, IP thật và log 429 | Đạt về code + HTTP test; kiểm mô hình proxy thực tế khi triển khai |
| Pool và job lặp | Đạt logic; tốc độ chốt 1000 trên máy đích chưa đo |
| Compose mới, migrate/admin/health | Đạt local, bao gồm khởi động production trong QA |
| Backup/restore/retention | Đạt chạy tay QA; cron và bản ngoài máy cần vận hành cấu hình |
| Load runner 1000/5 phút/2 phút cuối + số liệu/bất biến | Đã triển khai, test lịch chạy; local 100 đạt; đủ 1000 trên máy đích chưa đạt xác nhận |
| Hướng dẫn A4/QR, đầu mối Admin, tài liệu | Đã triển khai; UI/in thực tế chưa kiểm |

Chặn đưa vào thi thật: chưa có bằng chứng tải chuẩn 1000 trên máy chủ đích; chưa đo chốt đồng loạt trên đó; cần xác nhận HTTPS, QR/phiếu/UI bằng thiết bị thực và lịch backup/khôi phục ngoài máy. Đây là phần kiểm chứng/vận hành còn thiếu, không phải cam kết đã sẵn sàng production.

Sau kiểm tra đã dừng các container project exam_s13_qa, giữ nguyên volume QA để đối chiếu; không dừng Docker hoặc các project khác. File cấu hình QA có secret nằm ngoài source tại /tmp, không dùng cho triển khai thật.
