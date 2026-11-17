# Backend

> Chính sách kiểm tra hiện hành: xem `AI_RULES.md` ở root repository. AI không mở browser/test UI, không tự tạo DB hoặc đổi DB_NAME; dùng DB dev hiện có cho kiểm tra an toàn. Các lệnh integration dựng/xóa schema dưới đây là tài liệu suite cũ, không chạy trên DB dev; người dùng tự kiểm UI.


Backend Node.js Express 5 (CommonJS) dùng MySQL 8 (Knex + mysql2) và Winston structured logger. Yêu cầu nghiệp vụ: [../docs/PLAN.md](../docs/PLAN.md).

## Cài đặt

```bash
pnpm install
cp .env.example .env
```

1. Tạo database rỗng:

   ```sql
   CREATE DATABASE exam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Cấu hình `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=exam` trong `.env`. Tài khoản database cần quyền tạo bảng/index/foreign key và đọc/ghi dữ liệu trong database này.
3. Đổi `JWT_SECRET` và `CSRF_SECRET` thành hai chuỗi bí mật ngẫu nhiên, tối thiểu 32 ký tự và khác nhau (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Với `NODE_ENV=production`, backend **từ chối khởi động** nếu một trong hai khóa thiếu, ngắn hơn 32 ký tự, là giá trị mẫu hoặc trùng nhau. Ở môi trường phát triển chỉ ghi cảnh báo; nếu thiếu `CSRF_SECRET`, backend dẫn xuất một khóa CSRF riêng từ `JWT_SECRET`.
4. Chạy `pnpm migrate`. Migration nền tạo toàn bộ bảng theo mục 10 của plan; có rollback đầy đủ.
5. Tạo tài khoản ADMIN đầu tiên bằng `pnpm create-admin`; nhập username, họ tên và mật khẩu (ẩn khi nhập). Nếu đã có ADMIN, CLI từ chối; dùng `pnpm create-admin --force` để tạo thêm khi cần. Không có API tự đăng ký hay mật khẩu mặc định.

## Cấu trúc

- `src/app/`: Express app (`application.js`), khai báo route (`routes.js`), khởi động/tắt server (`server.js`), health check.
- `src/modules/<module>/`: `*.routes.js` → `*.controller.js` → `*.validator.js` / `*.service.js`. Hiện có `auth` (login, logout, me), `users` (quản trị tài khoản) và `questions` (ngân hàng câu hỏi/Excel).
- `src/middlewares/`: `authenticate` (cookie + phiên DB + CSRF cho request ghi), `requireAdmin`/`requireRole`, rate limit, request id/access log, xử lý lỗi.
- `src/constants/roles.js`: vai trò `ADMIN`, `USER`.
- `src/utils/`: `http-error`, `pagination`, `sql-like`, `datetime`, `audit-log`, `password-hash`, `password-policy`, `auth-cookie`, `validation`, `uuid`.
- `src/database/migrations/`: migration Knex nền (`202611100001_foundation.js`).
- `curl/`: cURL theo module (`auth.curl`, `health.curl`, `users.curl`, `questions.curl`).

## Xác thực

- `POST /api/auth/login` tạo bản ghi `auth_sessions`, đặt cookie HttpOnly chứa JWT (HS256, `jti` = id phiên) và trả `csrfToken`.
- Mỗi request đã đăng nhập kiểm tra JWT, phiên trong DB (chưa thu hồi, chưa hết hạn), tài khoản `is_active`, chưa `deleted_at` và `token_version` khớp. Request ghi phải gửi `X-CSRF-Token`.
- `req.user = { id, username, role }`. Route quản trị dùng `authenticate, requireAdmin`.
- Bảng `users` cần các cột: `id`, `username`, `full_name`, `password_hash`, `role`, `is_active`, `token_version`, `last_login_at`, `deleted_at`, `created_at`, `updated_at` (chi tiết ở mục 10 của plan).

## Cấu hình database

Mọi kết nối chạy UTC: mysql2 dùng `timezone: 'Z'` và `afterCreate` đặt `SET time_zone = '+00:00'` (`src/config/mysql-connection.js`). `TIMESTAMP`, `DATETIME` và `NOW()` vì vậy không phụ thuộc múi giờ của máy chủ hoặc MySQL; API trả thời gian ISO-8601 UTC (`src/utils/datetime.js`), UI hiển thị theo giờ Việt Nam.

Pool: `DB_POOL_MIN` trong khoảng 0–1, `DB_POOL_MAX` trong khoảng 1–50 (dev mặc định 3, production mặc định 20). Các timeout tính bằng mili giây:

```env
DB_POOL_MIN=0
DB_POOL_MAX=3
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_ACQUIRE_TIMEOUT_MS=30000
DB_POOL_CREATE_TIMEOUT_MS=30000
DB_POOL_REAP_INTERVAL_MS=1000
DB_CONNECT_TIMEOUT_MS=10000
DB_KEEPALIVE_INITIAL_DELAY_MS=0
```

Health check public: `GET /api/health` và `GET /api/health/db`. Nếu database tạm thời mất kết nối, backend trả `503` kèm `requestId` để truy log.

Source không phụ thuộc PM2. Trên shared hosting/cPanel, dùng `src/server.js` làm startup file và cơ chế Start App/restart của hosting; trên VPS có thể dùng PM2 hoặc systemd.

## Kiểm thử

```bash
pnpm test            # unit/HTTP test không cần database
pnpm test:database   # integration test *.integration.test.js trên database riêng (ví dụ exam_test), có từ giai đoạn 1
```

Test HTTP dùng `app.listen(0)` + `fetch` (mẫu `src/app.security.test.js`). Không trỏ integration test vào database thật.

## Logging và debug

Log ghi vào `backend/logs/` theo dạng JSON cho file và text ngắn gọn cho console, rotate theo ngày:

```text
logs/access-YYYY-MM-DD.log
logs/audit-YYYY-MM-DD.log
logs/warn-YYYY-MM-DD.log
logs/error-YYYY-MM-DD.log
logs/exceptions-YYYY-MM-DD.log
```

Mặc định mỗi file tối đa `20m` và giữ `30d`; đổi bằng `LOG_LEVEL`, `LOG_MAX_SIZE`, `LOG_RETENTION`.

Mỗi request được gán `requestId` và trả header `X-Request-Id`; khi người dùng báo lỗi, dùng id này để truy log:

```bash
rg '"requestId":"<request-id>"' logs
rg '"event":"request_error"' logs
rg '"event":"permission_denied"' logs
rg '"event":"auth_login_failed"' logs
rg '"statusCode":500' logs
```

- Access log: event `http_request` gồm method, path, statusCode, responseTimeMs, ip, userAgent và userId nếu đã đăng nhập.
- Audit log: thao tác nhạy cảm như `auth_login_success`, `auth_login_failed`, `auth_logout` và các thao tác quản trị (tài khoản, câu hỏi, đợt kiểm tra) khi được thêm.
- Error log: event `request_error` gồm requestId, method, path, statusCode, userId, params, query, body đã che thông tin nhạy cảm, message và stack.

Logger tự động che các field có tên chứa `password`, `token`, `secret`, `authorization`, `cookie`, `credential`, `private`, `vapid` và các field Web Push `endpoint`, `keys`, `auth`, `p256dh`. Header `X-Request-Id` chỉ được dùng lại khi khớp `[A-Za-z0-9-]{1,64}`, ngược lại backend tự sinh. Log và audit chỉ ghi mã phiên công khai (`public_id`), không ghi JWT `jti`. Lỗi 500 không trả `code` nội bộ của MySQL cho client.

## CORS và proxy

`CORS_ALLOWED_ORIGINS` liệt kê origin frontend được gọi API (local mặc định `http://localhost:3110,http://localhost:4174`). `CORS_ALLOW_SAME_ORIGIN=true` cho phép Origin trùng protocol + Host của chính website (khi frontend và API cùng domain qua reverse proxy), không dùng wildcard. `TRUST_PROXY=1` chỉ dùng khi backend nằm sau một reverse proxy và không mở port ra ngoài. Kiểm thử ở `utils/cors-origin.test.js` và `app.security.test.js`.

## Quản lý tài khoản (giai đoạn 1)

`GET/POST /api/admin/users`, `GET/PATCH/PUT/DELETE /api/admin/users/:id` yêu cầu ADMIN. Danh sách nhận `page`, `limit`, `search`; trả `{ items, pagination }`. Tạo nhận `username`, `fullName`, `password`, tùy chọn `role`, `isActive`. Sửa nhận `fullName`, `role`, `password`, `isActive`; username không đổi. DELETE xóa mềm, giữ username và lịch sử.

Không tự khóa/xóa tài khoản đang dùng; không khóa/xóa/hạ quyền ADMIN hoạt động cuối cùng. Thay đổi mật khẩu, khóa, xóa hoặc đổi vai trò tăng `token_version`, thu hồi mọi phiên trong cùng transaction. Các sửa đổi tài khoản dùng chung khóa dòng cố định trước khi kiểm tra admin cuối cùng. Password được băm Argon2id trước transaction. API ghi có CSRF, rate limit nhạy cảm và audit log không chứa mật khẩu/hash.

Integration test cần database **rỗng, riêng biệt**, tên có tiền tố `exam_stage1_test_`, dùng cùng cấu hình DB_HOST/DB_PORT/DB_USER/DB_PASSWORD trong `.env`:

```sql
CREATE DATABASE exam_stage1_test_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
TEST_DB_NAME=exam_stage1_test_local pnpm test:database
```

Test tự tạo bảng, dùng dữ liệu `e2e_`, kiểm tra migration up/down, CLI, API, quyền ADMIN/USER, thu hồi phiên và hạ quyền admin đồng thời; dọn bảng sau khi chạy. Không đặt TEST_DB_NAME thì test skip với lý do. Không dùng database thật; test từ chối database đã có bảng.

## Câu hỏi theo đợt và Excel (giai đoạn 8)

Module `src/modules/questions/`: route → controller → validator/service; ExcelJS và mã xác nhận ở `questions.excel.js`, transaction import ở `questions.import.service.js`. cURL: `curl/questions.curl`. Schema dùng migration nền đã có, không cần migration mới.

Chỉ ADMIN được gọi các endpoint sau:

- `GET /api/admin/exam-rounds/:id/questions`: `search` theo mã/nội dung, `category` (tên nhóm), `page`, `limit`; trả `{ items, validCount, pagination }` (validCount là số câu hợp lệ toàn đợt).
- `GET /api/admin/exam-rounds/:id/questions/categories`: nhóm phân trang, nhận `search`, `page`, `limit`; trả `{ items: [{ id, name }], pagination }`.
- `GET /api/admin/exam-rounds/:id/questions/:id`: chi tiết.
- `POST /api/admin/exam-rounds/:id/questions`: `questionCode`, `category` (tên nhóm), `content`, `optionA`, `optionB`, `correctAnswer`; tùy chọn `optionC`, `optionD`, `allowShuffleOptions` (mặc định true). Tên nhóm lưu trực tiếp trong `questions.category_name`, không có danh mục dùng chung.
- `PATCH/PUT /api/admin/exam-rounds/:id/questions/:id`: sửa các trường tương tự, có thể gửi một phần; validation dựa trên toàn bộ câu sau khi ghép.
- `DELETE /api/admin/exam-rounds/:id/questions/:id`: xóa hẳn câu chưa từng vào đề; câu đã dùng chỉ vô hiệu hóa, giữ mã và snapshot lịch sử. Đợt OPEN không được thiếu câu sau thao tác (409).
- `GET /api/admin/exam-rounds/:id/questions/export`: xuất mọi câu chưa vô hiệu hóa, streaming theo lô 100, cùng chín cột mẫu; có audit log. Import tối đa 500 dòng/lần, chia file xuất lớn thành các lô khi nhập.
- `GET /api/admin/questions/template`: tải `mau-cau-hoi.xlsx`, gồm sheet Câu hỏi rỗng và Hướng dẫn tiếng Việt.
- `POST /api/admin/exam-rounds/:id/questions/import`: multipart với `file` và `mode=preview|commit`; request ghi cần CSRF.

File `.xlsx` tối đa 5 MB, 500 dòng mỗi lần; đọc sheet đầu tiên. Giữ các cột `ma_cau_hoi, nhom_cau_hoi, noi_dung, lua_chon_a, lua_chon_b, lua_chon_c, lua_chon_d, dap_an_dung`. Cột tùy chọn `cho_phep_xao_tron` nhận true/false hoặc 1/0; để trống mặc định true. Có 2–4 lựa chọn liên tiếp từ A, đáp án A/B/C/D phải trỏ tới lựa chọn có nội dung. Không nhận công thức, liên kết hay ô có định dạng dữ liệu đặc biệt.

Preview không ghi database; trả `{ rows: [{ rowNumber, data, errors }], total, validCount, errorCount, previewToken }`. Chỉ có token khi mọi dòng hợp lệ. Mã duy nhất trong đợt theo collation MySQL, kể cả câu đã vô hiệu hóa; cùng mã ở hai đợt được phép. Commit phải gửi lại đúng file và `previewToken` do chính ADMIN đó nhận cho đúng đợt trong 15 phút. Toàn bộ câu hỏi được ghi trong một transaction. Thiếu bước preview/file khác/token sai trả 422; token hết hạn, mã xung đột sau preview hoặc phát lại commit trả 409. Khi commit lỗi, xem trước lại. Các thao tác ghi có audit log. File chỉ ở memory, không lưu file upload hoặc preview vào database.

Để kiểm tra riêng phân hệ này, tạo database rỗng `exam_questions_test_local`, rồi chạy:

```bash
TEST_QUESTIONS_DB_NAME=exam_questions_test_local pnpm test:database
```

Test từ chối tên database không có tiền tố `exam_questions_test_` hoặc database đã có bảng. Dữ liệu test mang tiền tố E2E_/e2e_; test tự tạo và dọn bảng. Thiếu biến thì skip có lý do. Có kiểm tra rollback giữa chừng bằng trigger test (tài khoản database test cần quyền TRIGGER). Có thể đặt cả TEST_DB_NAME và TEST_QUESTIONS_DB_NAME để chạy hai nhóm integration trên hai database riêng.

## Nhập tài khoản Excel

ADMIN tải mẫu bằng `GET /api/admin/users/template`, nhập bằng multipart `POST /api/admin/users/import`. File .xlsx tối đa 5 MB và 100 tài khoản/lần, sheet đầu tiên; cột bắt buộc `ten_dang_nhap`, `ho_ten`, `mat_khau`, tùy chọn `vai_tro` (USER mặc định hoặc ADMIN), `hoat_dong` (true mặc định, true/false hoặc 1/0). Username và mật khẩu phải là ô Văn bản để giữ số 0 đầu; không nhận công thức. Chỉ tạo mới, không ghi đè hoặc tái sử dụng tên tài khoản đã xóa.

`mode=preview` không ghi dữ liệu, trả lỗi theo dòng và `previewToken` khi tất cả hợp lệ. `mode=commit` gửi lại đúng file và token của cùng ADMIN trong 15 phút; xung đột trả 409, toàn bộ import rollback nếu bất kỳ dòng nào lỗi. Băm Argon2id tuần tự trước transaction. Preview không trả mật khẩu/hash, upload được đánh dấu nhạy cảm để không ghi vào log; audit chỉ ghi số lượng và ID tài khoản tạo.

Chính sách mật khẩu chung (API, CLI, form và Excel): tối thiểu 6 ký tự; cho phép chứa tên tài khoản và dài hơn 72 byte. Test import nằm trong `stage1.integration.test.js`; chạy bằng TEST_DB_NAME như hướng dẫn trên (cần quyền TRIGGER cho ca rollback).

Tên cột Excel tài khoản được ánh xạ: `ten_dang_nhap` → `username`, `ho_ten` → `full_name`, `mat_khau` → mật khẩu được băm vào `password_hash`, `vai_tro` → `role`, `hoat_dong` → `is_active`. Vẫn đọc được tên cột mẫu cũ; không chấp nhận hai cột cùng ánh xạ một trường.

Mẫu Excel câu hỏi dùng tên cột tiếng Việt không dấu, ánh xạ về các trường nội bộ tương ứng. Vẫn hỗ trợ tên cột tiếng Anh của mẫu cũ; không chấp nhận hai cột cùng ánh xạ một trường.

## Đợt kiểm tra (giai đoạn 3)

Module `src/modules/exam-rounds/` tách routes/controller/validator/service. Schema dùng `exam_rounds` và `questions.exam_round_id` (FK); đã sửa migration nền ở giai đoạn 8, bỏ hai bảng nhóm và unique mã theo đợt. cURL: `curl/exam-rounds.curl`.

- ADMIN: `GET/POST /api/admin/exam-rounds`, `GET/PATCH/PUT/DELETE /api/admin/exam-rounds/:id`. POST trả 201, DELETE trả 204; request ghi cần CSRF, có audit log.
- Tài khoản đã đăng nhập: `GET /api/exam-rounds`, `GET /api/exam-rounds/:id`. Chỉ trả OPEN/CLOSED; truy cập DRAFT trả 404. Không trả nội dung câu hỏi hoặc đáp án.
- Danh sách nhận `page`, `limit`, `search` (tên đợt), `status`; trả `{ items, pagination }`. Chi tiết và từng item có cấu hình camelCase, không còn `categories`/`categoryIds`.
- Tạo yêu cầu `title`, `questionCount`, `durationMinutes`, `maxAttempts`; mặc định Nháp, chưa cần câu hỏi, không nhận `categoryIds`. Ba số cấu hình là số nguyên từ 1 đến 2147483647. Ngưỡng `passingPercentage` là số nguyên 0–100, mặc định 70.
- Tùy chọn: `description`, `stopAfterPass=false`, `showCorrectAnswers=true`, `shuffleQuestions=true`, `shuffleOptions=true`, `status=DRAFT`, `startAt=null`, `endAt=null`. Trạng thái nhận DRAFT/OPEN/CLOSED. PATCH/PUT nhận một phần, ghép với cấu hình hiện tại rồi validation lại.
- Thời gian đầu vào là ISO có Z hoặc offset, lưu UTC, trả ISO UTC. Cho phép null để bỏ giới hạn; nếu có cả hai mốc thì kết thúc phải sau bắt đầu. Không tự đổi OPEN thành CLOSED khi hết endAt: giao diện hiển thị đã hết thời gian; chặn bắt đầu lượt theo lịch thuộc giai đoạn 4.
- Mọi lần lưu cấu hình OPEN đều kiểm tra đủ câu hợp lệ của chính đợt: chưa xóa mềm, có nội dung/lựa chọn/đáp án tương ứng hợp lệ. Thiếu câu trả 409 và rollback thay đổi. Thời điểm ngoài lịch không cản ADMIN lưu OPEN.
- Chỉnh sửa khóa dòng đợt trong transaction, chỉ sửa cấu hình đợt, không cập nhật bảng lượt/snapshot. Không được xóa đợt đã có lượt thi (409); có thể đóng đợt. Đợt chưa có lượt thi được xóa cùng toàn bộ câu hỏi trong transaction.

Integration test riêng cần database rỗng mang tiền tố `exam_rounds_test_`, cùng cấu hình kết nối local; ví dụ:

```sql
CREATE DATABASE exam_rounds_test_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
TEST_ROUNDS_DB_NAME=exam_rounds_test_local pnpm test:database
```

Thiếu biến thì skip rõ lý do; từ chối database đã có bảng. Test tạo dữ liệu E2E_/e2e_, kiểm tra phân quyền/CSRF, điều kiện OPEN, UTC, snapshot lịch sử và xóa, rồi dọn toàn bộ bảng do test tạo. Có thể đặt cả ba biến TEST_DB_NAME, TEST_QUESTIONS_DB_NAME, TEST_ROUNDS_DB_NAME để chạy ba nhóm trên ba database riêng. Phần start/quản lý lượt/chấm điểm xem module attempts (giai đoạn 4) bên dưới.

## Nhận diện người dự thi không mật khẩu

Migration `202611110001_participant_identity.js` thêm `party_committee`, `party_branch`, `participant_key` (unique nullable) vào users; giữ các tài khoản/dữ liệu cũ. Chạy `pnpm migrate` trước khi dùng luồng mới. Down chỉ bỏ ba cột mới và unique index.

Public `POST /api/auth/enter` nhận đúng `{ fullName, partyCommittee, partyBranch }` (ba chuỗi bắt buộc, tối đa 255 ký tự). Chuẩn hóa Unicode NFC, trim/gộp khoảng trắng; khóa SHA-256 của ba giá trị chữ thường bảo đảm cùng thông tin dùng cùng ID. Khác dấu tiếng Việt hoặc khác đơn vị là người khác. Unique constraint chống trùng khi nhiều request đồng thời. Luồng không tăng số lượt hay sửa lịch sử. Người bị khóa/xóa hoặc tài khoản có vai trò ADMIN không được tiếp tục qua endpoint này (403); không tái tạo để vượt giới hạn.

Người mới luôn có role USER và username kỹ thuật không hiển thị cho người dự thi; hash Argon2id ngẫu nhiên không được phát hành làm mật khẩu. Trả session cookie HttpOnly, CSRF token và user có partyCommittee/partyBranch/isParticipant; /auth/me trả cùng cấu trúc. Giữ các kiểm tra phiên/thu hồi/CSRF hiện có. Endpoint có rate limit riêng theo IP (`PARTICIPANT_RATE_LIMIT_*`). Nội dung entry được đánh dấu nhạy cảm; audit chỉ ghi ID/phiên. API /auth/login tài khoản cũ vẫn tương thích; frontend dành màn nhập mật khẩu riêng cho ADMIN.

Không ghép tài khoản cũ với người dự thi chỉ vì trùng họ tên: tài khoản cũ không có đủ thông tin đơn vị. ADMIN vẫn có thể xem, khóa/xóa người dự thi trong quản lý tài khoản; không được chuyển người dự thi không mật khẩu thành ADMIN. Khi sửa họ tên người dự thi, khóa nhận diện được cập nhật theo tên mới.

Cách nhận diện này không xác minh danh tính: ai biết đúng cả ba trường có thể vào cùng người; đây là cách vận hành đã được chọn. Lịch sử và số lượt gắn với ID đó, không phải mỗi lần đăng nhập.

Integration test dùng database rỗng riêng có tiền tố `exam_participants_test_`:

```bash
TEST_PARTICIPANTS_DB_NAME=exam_participants_test_local pnpm test:database
```

Tạo database test trước bằng cùng charset/collation như hướng dẫn; thiếu biến thì skip có lý do. Test kiểm tra migration bảo toàn tài khoản cũ, nối lịch sử, đồng thời, phân quyền, khóa/xóa, CSRF và ADMIN đăng nhập cũ. Test chỉ dùng dữ liệu e2e_/E2E_, tự dọn bảng.

## Lượt thi và chấm điểm (giai đoạn 4)

Module `src/modules/attempts/`: validator → controller → service, logic random/chấm thuần ở `attempts.logic.js`, job ở `attempts.job.js`. Truy vấn câu hợp lệ dùng chung với quản lý đợt tại `utils/valid-questions-query.js`. cURL: `curl/attempts.curl` và phần thử trong `curl/exam-rounds.curl`.

- `POST /api/exam-rounds/:id/start`, body `{}`: tạo mới trả 201, resume trả 200. Chỉ USER; khóa dòng users rồi đợt, kiểm tra/chốt lượt cũ, đếm lượt cùng chế độ, kiểm tra stopAfterPass và lịch, tạo attempt/snapshot trong cùng transaction. Unique constraint chặn trùng; lỗi trùng trả lượt đang có hoặc 409. Lượt đang làm được tiếp tục dù đợt bị đóng/cấu hình thay đổi; không tạo lượt mới khi đóng.
- `GET /api/attempts/:id`: đề/đáp án người dùng từ snapshot, có `serverTime` UTC, `remainingSeconds`, `isTrial`, cấu hình và thời hạn. `questions` có id, position, categoryName, questionCode, content, options [{key,content}], selectedAnswer. Không xuất correctAnswer/isCorrect/originalKey; ngay cả lượt đã chốt, chi tiết đáp án đúng chờ API kết quả giai đoạn 6.
- `PUT /api/attempts/:id/answers`: `{ answers: [{ attemptQuestionId, selectedAnswer }] }`, tối đa 500/lần; selectedAnswer là A/B/C/D hiện trên đề hoặc null để bỏ chọn. Kiểm tra tất cả câu/lựa chọn thuộc đề trước khi upsert trong transaction, không cho sửa bài đã kết thúc (409).
- `POST /api/attempts/:id/submit`, body `{}`: chấm theo snapshot, trả trạng thái và các số điểm; nộp lại trả cùng kết quả (idempotent), không sửa timestamp/điểm. Câu bỏ trống tính sai khi xét ngưỡng; incorrectCount là số câu chọn sai, unansweredCount tách riêng; xét PASS bằng nhân số nguyên.
- Các endpoint lượt thi kiểm tra sở hữu (403 nếu của người khác, 404 nếu không tồn tại), vai trò USER; request ghi cần CSRF. Có audit log start/lưu/nộp, không ghi toàn bộ đề/đáp án vào audit. GET lượt thi no-store.

Random lấy đúng số câu không trùng bằng reservoir sampling `crypto.randomInt`, đọc câu của chính đợt theo lô 200. Khi tắt xáo câu, các câu được chọn sắp theo mã; khi bật dùng Fisher–Yates. Mỗi snapshot lựa chọn giữ key hiển thị và originalKey gốc ở backend, đáp án đúng đã ánh xạ theo key hiển thị; cờ allowShuffleOptions=false luôn giữ thứ tự lựa chọn. Snapshot lưu tên nhóm/mã/nội dung để thống kê sau khi câu gốc đổi hoặc xóa mềm.

Hàm chấm dùng chung khóa dòng attempt cho submit, chốt lười và job; chỉ chuyển IN_PROGRESS một lần, đặt in_progress_flag=NULL. Ân hạn mạng cố định 3 giây áp dụng thống nhất cho request và job; server vẫn hiển thị remainingSeconds=0 ở expiresAt. Lượt thử không có ân hạn vượt thời điểm chính thức. Thời lượng ghi không vượt expiresAt. Khi lưu đáp án hết hạn, transaction vẫn commit EXPIRED/điểm rồi mới trả 409.

Job chạy từ `src/app/server.js`, mặc định 30 giây/lần, mỗi lần tối đa 50 lượt, xử lý tuần tự, chống chạy chồng, timer unref. `ATTEMPT_EXPIRY_JOB_ENABLED=false` để tắt, `ATTEMPT_EXPIRY_INTERVAL_MS` đổi chu kỳ (tối thiểu 1000ms). Không tạo timer khi import app/migration hoặc trong node:test. Shutdown chờ job trước khi đóng pool.

Chạy thử theo PLAN: cấu hình `trialStartAt < startAt` trên đợt OPEN; start trong khoảng đó có isTrial=true, expiresAt=min(thời lượng,startAt,endAt). Đếm lượt/PASS riêng theo is_trial; mỗi người chỉ có một IN_PROGRESS chung hai chế độ. Tới giờ chính thức lượt thử hết hạn trước khi tạo lượt chính thức số 1. `DELETE /api/admin/exam-rounds/:id/trial-data` yêu cầu ADMIN, CSRF và body `{confirm:true}`, xóa thử theo lô trong transaction, giữ nguyên chính thức và ghi audit.

### Schema phát triển theo PLAN

Đã sửa migration nền (PLAN cho phép khi chưa vận hành thật): thêm exam_rounds.trial_start_at, attempts.is_trial, đổi unique attempt_number thành `(user_id, exam_round_id, is_trial, attempt_number)`, thêm snapshot category_name/question_code. Không tự chạy/reset database local hiện tại. Với **database phát triển dùng một lần, không có dữ liệu cần giữ**, dựng lại schema từ các migration trước khi chạy API mới. Không áp dụng rollback/reset lên database thật hoặc database có dữ liệu cần giữ.

### Kiểm thử lượt thi

Tạo database rỗng riêng có tiền tố `exam_attempts_test_`, cùng charset/collation. Chạy:

```bash
TEST_ATTEMPTS_DB_NAME=exam_attempts_test_local pnpm test:database
```

Test chỉ dùng dữ liệu e2e_/E2E_, tự tạo/dọn bảng. Thiếu biến thì skip có lý do. Kiểm tra 6 start đồng thời, resume, maxAttempts 1/2/3, PASS dừng thi, snapshot, IDOR, lựa chọn sai, submit đồng thời, chốt lười/job và chạy thử/xóa thử. Không triển khai màn làm bài, trang kết quả, API result/my-results hoặc báo cáo trong giai đoạn này.

## Kết quả và lịch sử cá nhân (giai đoạn 6)

Module `modules/attempts/results.*` dùng cùng cơ chế chấm `finalizeLocked`/`grade` của submit, job và chốt lười; không có cơ chế chấm thứ hai. Không cần migration mới.

- `GET /api/attempts/:id/result`: USER sở hữu lượt; 403 nếu của người khác, 404 nếu không tồn tại, 422 nếu UUID sai. Chốt lười nếu hết hạn; còn đang làm trả 409. Trả điểm, ngưỡng/cấu hình, thời gian, nội dung/lựa chọn và đáp án đã chọn từ snapshot. Chỉ thêm `questions[].correctAnswer` khi lượt kết thúc và snapshot `showCorrectAnswers === true`; không lộ `originalKey`. API lấy lượt thông thường vẫn không trả đáp án đúng.
- `GET /api/my-results?page=1&limit=20`: danh sách đợt OPEN/CLOSED hoặc có lịch sử của chính người đăng nhập, gồm `finalResult`, `usedAttempts`, `maxAttempts`, `activeAttempts`. Có đợt chưa thi để hiển thị NOT_STARTED.
- `GET /api/my-results?examRoundId=<uuid>&page=1&limit=20`: `{ summary, items, pagination }`, lịch sử phân trang mọi lượt của chính USER trong đợt; mỗi item có nhãn `isTrial`, trạng thái, tỷ lệ, PASS/FAIL, thời gian và tiêu đề snapshot. Không nhận userId để chọn người khác.

Kết quả cuối chỉ tổng hợp chính thức: có PASS → PASSED; chưa có lượt chính thức → NOT_STARTED; không PASS và đợt đóng/hết giờ → FAILED; lượt cuối còn đang làm trong đợt mở → IN_PROGRESS_ROUND; còn lượt → IN_PROGRESS_ROUND; các trường hợp hết lượt còn lại → FAILED. Thời điểm trước startAt không làm đợt thành FAILED nếu vẫn còn khả năng thi sau đó. Lượt thử có lịch sử riêng nhưng không đóng góp vào tổng lượt/PASS chính thức. Không cập nhật hoặc ghi đè lịch sử để lưu kết quả tổng hợp.

Các API đều USER-only, có authentication/no-store; cURL trong `curl/attempts.curl`, `curl/results.curl`. Test ngưỡng 14/20 và 13/20 ở 70% có tại `attempts.logic.test.js`; test trạng thái cuối tại `results.logic.test.js`. Integration trong `src/database/attempts.integration.test.js` kiểm tra HTTP 401/403/404/409/422, IDOR, snapshot sau sửa/xóa mềm câu và thay cấu hình, ẩn đáp án, giữ kết quả sau đọc/nộp lại, lịch sử/phân trang và tách lượt thử. Test rà soát bổ sung kiểm tra `/my-results` tự chốt lượt hết giờ bằng cơ chế chung, giữ PASSED sau lượt FAIL tiếp theo, không cho query userId chọn người khác, ẩn đáp án của lượt EXPIRED và giữ nguyên điểm/thời gian/cấu hình lượt PASS cũ. Chạy bằng `TEST_ATTEMPTS_DB_NAME=exam_attempts_test_local pnpm test:database` trên database test rỗng riêng như hướng dẫn trên.

## Báo cáo ADMIN (giai đoạn 7)

`src/modules/reports/` gồm validator, service Knex, controller và ExcelJS streaming. Route dưới `/api/admin/exam-rounds/:id/` kế thừa authenticate/requireAdmin; không cần migration mới. cURL: `curl/reports.curl` (cookie `admin.cookies.txt` lấy từ `curl/auth.curl`). Các API no-store:

- `GET results`: `{ round, isTrial, statistics, items, pagination }`. Mỗi item là một người có lượt trong loại dữ liệu đang xem; có fullName, partyCommittee, partyBranch, title, usedAttempts/maxAttempts, bestPercentage (null nếu chưa có lượt chốt), finalResult, latestAt (UTC).
- `GET statistics`: participantCount, passedCount, failedCount, incompleteCount, passRate, attemptCount, averageAttempts và isTrial.
- `GET question-statistics`: items phân trang gồm questionId, questionCode, categoryName, content, encounterCount, correctCount, correctRate, optionACount/optionBCount/optionCCount/optionDCount, unansweredCount.
- `GET export`: tải `.xlsx` gồm Tổng hợp (cấu hình lọc, thời điểm và đủ chỉ số), Chi tiết (đủ cột bảng người) Theo câu hỏi và Theo đảng bộ. Xuất tất cả trang theo bộ lọc; ngày hiển thị Asia/Ho_Chi_Minh, số và tỷ lệ là numeric cell. ExcelJS streaming, không nạp toàn bộ người/lượt/file vào RAM. Audit `exam_round_report_exported` gồm actor, đợt, bộ lọc, loại dữ liệu và số hàng; lỗi sau khi stream có log và đóng kết nối.

Bộ lọc chung: search (họ tên/đơn vị), partyCommittee, partyBranch (LIKE có escape ký tự wildcard), result (PASSED/FAILED/IN_PROGRESS_ROUND/NOT_STARTED), isTrial (`false` mặc định, `true` xem riêng lượt thử). Phân trang page/limit qua helper chung (limit tối đa 100); sort=`correctRate|encounterCount`, order=`asc|desc` cho câu hỏi/Excel. UUID/bộ lọc sai →422, đợt không tồn tại →404, chưa đăng nhập →401, USER →403. Không nhận SQL/sort tùy ý.

Cách tính: mỗi user_id có ít nhất một lượt trong phạm vi lọc được tính một người, bất kể bao nhiêu lượt. Kết quả cuối dùng thứ tự ưu tiên chung ở `attempts/results.logic.js` (cả biểu thức SQL và hàm thuần có test đối chiếu): có PASS luôn PASSED, không PASS và đợt đóng/hết giờ thì FAILED; đợt mở còn khả năng thi thì IN_PROGRESS_ROUND. Người chưa có lượt không thuộc tập người tham gia, vì vậy lọc NOT_STARTED trả rỗng. Tỷ lệ Đạt = số người PASSED/tổng người phù hợp *100; trung bình lượt = tổng lượt của tập người phù hợp/số người. Điểm cao nhất là MAX(percentage) đã chốt; thời gian gần nhất là MAX(started_at). Lượt thử tách hẳn khỏi chính thức trong mọi số liệu/file.

Bảng/dashboard dùng cùng lượt đọc repeatable-read và cùng iterator tập người theo lô 100; bộ lọc result chọn người, giữ toàn bộ lượt của người đó để tính chỉ số/câu hỏi. Trước khi đọc, lượt quá hạn được chốt lười bằng expireOne/finalizeLocked hiện có, không tạo cơ chế chấm khác. Mỗi request phản ánh thời điểm đọc riêng; xuất Excel dùng một transaction đọc nhất quán cho cả ba sheet. Không ghi đè kết quả hoặc snapshot đã chốt.

Thống kê câu chỉ xét SUBMITTED/EXPIRED trong loại dữ liệu và tập người đã lọc. Gom theo question_id gốc, không đọc nội dung/đáp án từ ngân hàng hiện tại. Nếu nhiều phiên bản cùng câu, dùng snapshot có attempt_question.id lớn nhất theo thứ tự ID làm đại diện (xác định ổn định, không khẳng định là phiên bản mới nhất); mọi lượt của các phiên bản đều góp vào số đếm. Đúng/sai dựa correct_answer snapshot; JSON options_snapshot quy đổi key đã chọn về originalKey để đếm A/B/C/D gốc, null/không có hàng trả lời là bỏ trống. Tỷ lệ đúng = lượt đúng/lượt gặp *100. SQL gom nhóm, chỉ lấy tối đa 100 kết quả/metadata mỗi lô. Chỉ số tổng hợp vẫn bao gồm lượt đang làm trong tổng lượt, còn thống kê câu chỉ gồm lượt đã chốt.

Test trên database rỗng riêng:

```sql
CREATE DATABASE exam_reports_test_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
TEST_REPORTS_DB_NAME=exam_reports_test_local pnpm test:database
```

Tên phải có tiền tố exam_reports_test_; test từ chối DB có bảng, chỉ tạo E2E/e2e và tự dọn schema. `reports.integration.test.js` kiểm tra 1 người nhiều lượt, có PASS rồi FAIL vẫn PASSED, đợt đóng, bộ lọc nhất quán với Excel, dữ liệu thử riêng, snapshot sau sửa/xóa mềm câu, quy đổi lựa chọn gốc, 401/403/404/422, nội dung ba sheet và audit xuất. Có đối chiếu SQL/hàm thuần cho các trạng thái, chốt lười lượt hết giờ và loại lượt đang làm khỏi thống kê câu. Thiếu TEST_REPORTS_DB_NAME thì skip có lý do. Không chạy script thử tải/Docker/VPS trong giai đoạn này.

## Chạy thử giai đoạn 8

Chỉ trên database phát triển dùng một lần/rỗng, dựng schema mới bằng `pnpm migrate` (không chạy lại migration trên dữ liệu thật). Migration `202611100001_foundation.js` có up/down đầy đủ: tạo đợt trước câu hỏi, FK RESTRICT, unique `(exam_round_id, question_code)` và index `(exam_round_id, deleted_at)`; không còn hai bảng nhóm.

ADMIN tạo đợt Nháp → thêm/import câu ở `/api/admin/exam-rounds/:id/questions` → PATCH đợt `{ "status": "OPEN" }`. CRUD/import/xóa câu và thay cấu hình/xóa đợt cùng khóa dòng đợt; xóa đợt và câu trong một transaction. Sinh đề chỉ đọc `exam_round_id`, tên nhóm snapshot từ `category_name`; chấm điểm/kết quả/báo cáo/Excel báo cáo tiếp tục đọc snapshot cũ.

`questions.integration.test.js` bổ sung cách ly đợt A/B, unique trong đợt và cùng mã khác đợt, URL truy cập chéo, xóa cứng/vô hiệu hóa, bảo vệ số câu OPEN, xuất–import giữ đủ dữ liệu, token ràng buộc đợt và snapshot sau sửa câu. Các fixture rounds/attempts/reports đã chuyển sang tạo Nháp → thêm câu riêng → mở. Chạy `pnpm test` và `pnpm test:database` với TEST_QUESTIONS_DB_NAME, TEST_ROUNDS_DB_NAME, TEST_ATTEMPTS_DB_NAME, TEST_REPORTS_DB_NAME trên bốn database rỗng riêng như hướng dẫn từng module. Không chạy giai đoạn 9.

## Phiếu kết quả và tra cứu không cần phiên

Bổ sung theo yêu cầu sau giai đoạn 8, không triển khai thử tải/triển khai giai đoạn 9. Chạy `pnpm migrate` để áp dụng **migration mới** `202611120001_attempt_receipts.js`; chỉ thêm bảng `attempt_receipts`, không reset các bảng/tài khoản/lượt thi đang có. Bảng gồm UUID, attempt_id unique/FK RESTRICT, verification_code unique và data_snapshot JSON. Rollback migration phiếu xóa phiếu/mã đã cấp, vì vậy không rollback trên dữ liệu cần giữ.

Lượt mới snapshot thêm họ tên/đảng bộ/chi bộ tại lúc bắt đầu. Hàm chấm chung finalizeLocked cấp một phiếu bất biến trong cùng transaction khi SUBMITTED/EXPIRED, gồm tên đợt theo config_snapshot, danh tính snapshot, số đúng/sai/bỏ trống, điểm thang 10, ngưỡng, kết quả đã chấm, thời lượng, thời điểm nộp và nhãn chạy thử. Không thay đổi công thức chấm, điểm hay kết quả cũ. Điểm thang 10 = số đúng/tổng câu ×10, làm tròn 2 chữ số; số sai trên phiếu gồm chưa trả lời. Mỗi lượt có phiếu riêng; không tự chọn lượt cao nhất thay thế kết quả lượt. Phiếu chạy thử hiện nhãn rõ và bị dọn khi ADMIN xóa dữ liệu chạy thử.

- `GET /api/attempts/:id/receipt`: USER sở hữu; 401/403/404/422 như API lượt, 409 nếu đang làm. Có chốt lười bằng cơ chế cũ. Lượt đã chốt trước tính năng này được cấp phiếu ở lần chủ sở hữu mở phiếu đầu tiên, dùng danh tính hiện tại nếu snapshot cũ chưa có; từ đó bất biến. Không sửa attempts/config_snapshot cũ.
- Kết quả/nộp bài thêm receiptCode khi phiếu đã có; không xuất receiptCode trong lượt đang làm. Không thêm đáp án hoặc đề vào phiếu.
- `POST /api/receipts/lookup` body `{code}`: công khai, **chỉ đọc**, không yêu cầu phiên hoặc CSRF; không nhận userId/attemptId. Mã hex ngẫu nhiên 80 bit, hiển thị 5 nhóm 4 ký tự (ví dụ định dạng XXXX-XXXX-XXXX-XXXX-XXXX); ai có mã xem được thông tin cá nhân trên phiếu nên cần giữ riêng tư. Không có danh sách/tìm theo họ tên công khai. Giới hạn 30/IP/15 phút; 422 sai mã, 404 không tồn tại, 429 quá giới hạn. No-store, request nhạy cảm để không log mã/body; audit chỉ receiptId/attemptId và người thực hiện khi có. Không đặt mã trong URL.

cURL: `curl/results.curl`, `curl/receipts.curl`. Integration `receipts.integration.test.js` chạy với `TEST_RECEIPTS_DB_NAME=exam_receipts_test_local pnpm test:database` trên database rỗng riêng, prefix bắt buộc. Kiểm tra mã bất biến/concurrent, IDOR ADMIN/USER/chưa đăng nhập, code public, không lộ câu/đáp án, snapshot danh tính/tên đợt sau sửa, điểm không đổi, expired/job, phiếu thử/xóa thử, lượt cũ và rate limit. Các fixture integration khác đã thêm up/down migration phiếu để kiểm hồi quy toàn schema.

## Giai đoạn 9: kiểm tra MVP và thử tải local

Cài mới: tạo MySQL `exam` (utf8mb4/utf8mb4_unicode_ci), `cp .env.example .env`, điền DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME, tạo hai secret khác nhau, `pnpm install`, `pnpm migrate`, `pnpm create-admin`, `pnpm dev`. Frontend chạy theo README frontend; gốc `pnpm dev` chạy cả hai. Không reset DB có dữ liệu. Production phải dùng AUTH_COOKIE_SECURE=true khi HTTPS; startup từ chối cấu hình false, SameSite=none không dùng cookie không Secure. Node test runner dùng `NODE_TEST_CONTEXT`, không cần đổi NODE_ENV thành test.

Kịch bản thử tải giai đoạn 9 đã được thay bằng kịch bản giai đoạn 13. Dùng [VAN_HANH.md](../docs/VAN_HANH.md) để dựng Compose QA cách ly, smoke API và chạy tải theo nhịp hiện tại. Không dùng tham số/giới hạn cũ hoặc trỏ suite dựng/xóa schema vào DB dev. Báo cáo giai đoạn 9 là lịch sử, không phải bằng chứng tải production hiện tại.

## Giai đoạn 10: trạng thái tham gia, đảng bộ và lịch sử Admin

GET `/api/exam-rounds` và `/:id` trả `participation` của chính USER: lượt chính thức đã dùng/tối đa/còn lại, lượt thử riêng, lượt đang làm, kết quả cuối, quyền bắt đầu/tiếp tục và `reasonCode` NOT_STARTED/ENDED/LIMIT_REACHED/PASSED. Admin nhận `validQuestionCount`; mở/đóng vẫn dùng PATCH đợt, kiểm đủ câu trong transaction và audit hiện có.

API ADMIN mới:
- GET `/api/admin/exam-rounds/:id/committee-statistics`: phân trang và bộ lọc báo cáo hiện có; nhóm NFC/khoảng trắng/hoa-thường, giữ phân biệt dấu. `committeeKey` là khóa SHA256 trả từ API, dùng lọc chính xác bảng người và Excel.
- GET `/api/admin/exam-rounds/:id/participants/:userId/attempts`: lịch sử mọi lượt của người đó trong đợt, phân trang.
- GET `/api/admin/attempts/:id`: chi tiết câu/đáp án theo snapshot chỉ đọc, không tự chốt lượt; audit khi xem. USER bị 403, chưa đăng nhập 401.

Excel có bốn sheet Tổng hợp, Chi tiết, Theo câu hỏi, Theo đảng bộ. Tổng hợp đảng bộ xử lý theo lô tối đa 100 người, dùng bảng tạm theo connection/transaction; tài khoản MySQL cần quyền `CREATE TEMPORARY TABLES` trên database ứng dụng. Không cần migration hay bảng nghiệp vụ mới.

cURL: `curl/exam-rounds.curl`, `curl/reports.curl`, `curl/admin-attempts.curl`. Test mới `src/database/stage10.integration.test.js`, biến `TEST_STAGE10_DB_NAME=exam_stage10_test_local` trỏ DB test rỗng riêng. Chạy cùng bảy biến TEST_* trước đó qua `pnpm test` và `pnpm test:database`. Chi tiết lệnh và kết quả ở [STAGE10_REVIEW](../docs/STAGE10_REVIEW.md).

## Cơ cấu đề — giai đoạn 11

Thay hoàn toàn chia đề ba chế độ/bộ đề tạo trước. Migration `202611130001_round_papers.js` đã sửa chỉ thêm `exam_rounds.selection_config`, rollback chỉ xóa cột đó. Không có bảng đề tạo trước hoặc cột khóa riêng. Database dev/test phải dựng lại; chạy migrate:latest trên schema cũ đã đánh dấu migration này không đủ để cập nhật cấu trúc. Không chạy thao tác dựng lại trên dữ liệu thật.

API tạo/sửa đợt không nhận questionCount hoặc selectionConfig (422). Nháp mới mặc định RANDOM, questionCount=20; có thể tạo khi chưa có câu, rồi import câu và cấu hình qua API riêng. GET đợt vẫn trả questionCount do Backend tính. Danh sách Admin trả validQuestionCount (BY_GROUP chỉ tính nhóm lấy >0) và structureSufficient (đủ từng nhóm, không chỉ đủ tổng).

API ADMIN dưới `/api/admin/exam-rounds/:id/structure`:
- GET: `{selectionConfig,questionCount,groups,locked}`. Mỗi nhóm có category, validCount, count, order, isNew. Nhóm chuẩn hóa NFC/khoảng trắng/hoa-thường, giữ phân biệt dấu; mặc định sắp xếp tự nhiên, nhóm mới sau khi lưu có count=0, isNew=true.
- PUT: RANDOM nhận `{ "mode": "RANDOM", "count": 50 }`; BY_GROUP nhận `{ "mode": "BY_GROUP", "groups": [{ "category": "Nghị quyết 1", "count": 3, "order": 0 }] }`. count của nhóm là số nguyên >=0, 0 không được chọn. Backend tính question_count bằng tổng. selection_config lưu đúng `{mode,groups}`, số RANDOM lưu ở question_count. Nhóm hiện có nhưng chưa có trong request được thêm cuối với count=0.
- POST `/preview`: nhận cùng payload PUT để xem cơ cấu đang nhập, trả câu/đáp án snapshot cho ADMIN, không tạo lượt, không ghi database. Audit `exam_structure_previewed`; PUT audit `exam_structure_updated`.

Thiếu câu hoặc lỗi theo dòng trả 422 với `code=STRUCTURE_INVALID`, `groupErrors:[{category,message,index?,count?,available?}]`. Tổng phải >=1, không nhận chế độ/phát đề cũ. Chưa đăng nhập 401, USER 403, ghi sai CSRF 403, UUID sai 422, đợt không tồn tại 404. Tối đa 1000 nhóm/đợt; số câu mỗi đề là số nguyên dương <=2147483647 và không vượt khả năng thực tế.

PUT khóa bằng dòng round trong transaction; không cho lưu khi có bất kỳ lượt chính thức, trả 409: “Đợt đã có người thi, không thay đổi được cơ cấu đề”. Lượt thử không khóa, xóa thử không mở khóa chính thức. OPEN kiểm lại cơ cấu, thiếu câu trả 409; xóa/vô hiệu hóa/đổi nhóm câu làm thiếu cơ cấu OPEN bị rollback. Các sửa cấu hình ngoài cơ cấu vẫn theo quy tắc snapshot cũ.

Mỗi lượt reservoir sampling theo cơ cấu bằng crypto.randomInt, đọc theo lô 100, không trùng câu trong lượt. BY_GROUP giữ order, chỉ đảo câu trong nhóm; RANDOM đảo toàn bộ khi bật shuffle_questions. shuffle_options theo quy tắc cũ. config_snapshot lưu selectionConfig; không thay chấm điểm, giới hạn lượt, chạy thử, kết quả/báo cáo hoặc snapshot lượt trước. Không bảo đảm bộ câu giữa hai lượt khác hoàn toàn.

cURL `curl/structure.curl`, cập nhật `curl/exam-rounds.curl`. Unit `structure.logic.test.js`; integration `structure.integration.test.js`, biến `TEST_STRUCTURE_DB_NAME=exam_structure_test_local`. Các fixture hồi quy cũ dùng `database/test-rounds.js` để đặt số câu trước khi seed câu (chỉ test); ứng dụng không có API tương thích questionCount cũ. `database/test-foundation.js` dựng/rollback schema mới. Chạy pnpm test và pnpm test:database với biến TEST_* của từng module trên DB test rỗng riêng. Chi tiết kiểm tra và cấu hình dev đã dựng: [STAGE11_REVIEW](../docs/STAGE11_REVIEW.md).


Import câu hỏi 2–3 lựa chọn: có thể bỏ hẳn cột `lua_chon_c`/`lua_chon_d` (`option_c`/`option_d` ở mẫu cũ) hoặc giữ cột và để trống. A/B luôn bắt buộc; có D phải có C, đáp án đúng phải có nội dung tương ứng. Mẫu tải xuống/xuất Excel vẫn giữ đủ cột để tương thích. Gửi file bằng multipart `--form 'file=@duong_dan.xlsx'`; không tự gán boundary hoặc dùng bản cURL trình duyệt thiếu dữ liệu file nhị phân.

Bộ đọc câu hỏi có bước tương thích XLSX dùng prefix namespace SpreadsheetML (ví dụ `x:workbook`, `x:worksheet`), vốn có thể khiến ExcelJS không đọc được file. Chỉ chuẩn hóa XML trong RAM khi cách đọc thông thường thất bại, theo URI namespace; không sửa file nguồn, không bỏ kiểm tra công thức/liên kết/đáp án. Bước tương thích giới hạn tổng XML được xử lý 20 MB, không nhận DTD. Thư viện trực tiếp: JSZip và saxes. Test `questions.xlsx-compat.test.js` và HTTP preview/commit trong `questions.integration.test.js`.

## Giai đoạn 12 — submit kèm đáp án

POST `/api/attempts/:id/submit` nhận `{answers:[{attemptQuestionId,selectedAnswer}]}`, gồm cả null để bỏ chọn; tối đa 10000 đáp án trong submit, API lưu lô vẫn tối đa 500. Body rỗng được giữ để tương thích các client trước. Validate format/ID/phương án; câu không thuộc lượt hoặc phương án không tồn tại trả 422, không ghi một phần. Dùng cùng transaction và khóa attempt để ghi toàn bộ + chấm; gọi lại SUBMITTED trả kết quả cũ và không ghi đè. Sau deadline + sai lệch cho phép (trial không vượt mốc chính thức) chốt EXPIRED bằng dữ liệu đã nhận trước, trả 409 ATTEMPT_EXPIRED, không nhận đáp án muộn; tiếp tục đọc result để xem bài đã chốt.

GET lượt thêm answerUpdatedAt từng câu để hợp nhất lựa chọn local; không lộ đáp án đúng. Công thức chấm, số lượt, trial, config_snapshot và đề lịch sử giữ nguyên; không thêm migration. Audit submit/lưu lô giữ nguyên.

cURL cập nhật `curl/attempts.curl`; unit `attempts.submit.test.js`, integration hồi quy `attempts.integration.test.js` bổ sung payload đầy đủ/concurrent/idempotent/late/foreign answer. Theo chính sách mới, AI không tạo database test hoặc chạy suite dựng/xóa bảng trên DB dev; unit và syntax chạy bình thường, integration cũ để người dùng chủ động vận hành riêng khi cần. Không gán TEST_* vào DB dev hiện có. Kết quả đã chạy trước/sau thay đổi chính sách: [STAGE12_REVIEW](../docs/STAGE12_REVIEW.md).

## Vận hành 1000 người — giai đoạn 13

Tài liệu chuẩn: [VAN_HANH.md](../docs/VAN_HANH.md), `../.env.production.example`, Compose mới. Một Backend; pool production 20/dev 3, trần 50 (thay trần cũ 4). Rate limit toàn API 30000/IP, vào thi 3000/IP; quota chung các API người thi 600/user/15 phút sau authenticate. Login Admin và tra cứu công khai giữ quota thấp; mỗi 429 có audit log. Các giá trị qua biến môi trường trong `.env.example` và Compose. Proxy duy nhất Caddy, TRUST_PROXY=1, không publish API/DB.

Job expiry lặp lô 100, dừng khi chưa đủ lô hoặc hết ngân sách `ATTEMPT_EXPIRY_MAX_RUN_MS`, chống chạy chồng; không thay chấm điểm/snapshot. Query chỉ chọn quá hạn cộng grace để lô chưa tới hạn không chặn các lô tiếp theo.

Đã bỏ API cấu hình hướng dẫn (`/api/public/guide`, `/api/admin/guide`) và biến `APP_SETTINGS_FILE` theo yêu cầu đơn giản hóa; trang hướng dẫn phía frontend cũng đã bỏ.

`pnpm load-test` mặc định 1000 user, ramp 300s, batch/GET 30s, nộp dồn trong 120s cuối của 600s; nhóm 100/IP sau handshake DB thử. Chỉ DB exam_load_test_*, đợt E2E_ROUND_ OPEN trong cửa sổ thử. Tham số rút gọn và ngưỡng trong tài liệu vận hành. Môi trường Docker QA riêng được giao ở giai đoạn này, không đổi DB dev hay chạy trên dữ liệu thật.

Mã xác nhận phiếu mới gồm 6 ký tự chữ in hoa/số (tránh ký tự dễ nhầm). Unique index và cơ chế sinh lại khi trùng vẫn giữ nguyên. Mã dài đã cấp vẫn tra cứu được, không đổi dữ liệu phiếu cũ, không cần migration.

### Admin in lại phiếu

Menu **Phiếu kết quả** tại `/admin/receipts`: danh sách có phân trang, tìm chính xác theo mã mới 6 ký tự hoặc mã cũ, xem/in lại và tải PDF cùng mẫu người thi. API ADMIN: `GET /api/admin/receipts?page=1&limit=20&code=AB3K7X`, `GET /api/admin/receipts/:attemptId`. Chỉ đọc snapshot phiếu đã lưu, không tạo/chấm lại lượt; có audit khi liệt kê/xem. Không có danh sách phiếu công khai cho USER. Không cần migration.

Tự thử: Admin → Phiếu kết quả → tìm mã → Xem phiếu / In lại → Tải PDF; thử mã không tồn tại và mã sai. USER gọi hai API ADMIN phải 403, chưa đăng nhập 401. Danh sách chỉ có phiếu đã được cấp; lượt chưa kết thúc không có phiếu.

Giai đoạn 16 chỉ sửa `knexfile.test.js`: mặc định development 3, production 20, trần 50, không sửa cấu hình runtime/API. `pnpm test` đã qua 108 test, 9 integration DB skip vì không được dựng/xóa schema trên DB dev.

### Giai đoạn 17 — summary Admin theo lô và kết quả gần nhất

`GET /api/admin/exam-rounds` thêm `statusCounts` (theo search, trước status filter), mỗi dòng có summary/missing/totalValidQuestionCount/groupCount. Chi tiết Admin dùng cùng summary. Helper `modules/exam-rounds/admin-summary.js` gom theo round/user rồi round bằng một query attempts cho mọi ID trên trang; không N+1. summary chính thức: inProgressCount, submittedCount (SUBMITTED + EXPIRED), participantCount, passedCount, passRate, attemptCount; hasAttempts tính cả thử để giữ điều kiện xóa. Mọi tỷ lệ/điểm/kết quả dùng quy tắc cũ, không migration.

`GET /api/admin/exam-rounds/:id/results?sort=latestAt&order=desc`: sort theo lần nộp cuối của người trong dữ liệu đã lọc trước limit/offset, id làm thứ tự phụ ổn định. Khi dùng sort này latestAt = MAX(submitted_at), null nếu chưa nộp; latestSubmittedAt được bổ sung, cách xem mặc định cũ giữ latestAt cũ. Không đổi cách tính điểm/kết quả cuối, quyền hay audit. cURL đã cập nhật trong `curl/exam-rounds.curl`, `curl/reports.curl`.

`pnpm test`: **113 PASS, 0 FAIL, 9 SKIP**. Unit kiểm tra SQL theo lô/không N+1, số liệu serialize và SQL latestAt/phân trang. Regression MySQL đã bổ sung vào reports.integration.test.js nhưng SKIP vì suite cần schema rỗng và dựng/xóa bảng, không phù hợp DB dev. Không nhận unit là bằng chứng integration pass. Xem [STAGE17_REVIEW](../docs/STAGE17_REVIEW.md).
