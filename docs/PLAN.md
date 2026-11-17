# XÂY DỰNG HỆ THỐNG KIỂM TRA NHẬN THỨC TRỰC TUYẾN

Bạn là Senior Fullstack Developer. Hãy xây dựng ứng dụng web kiểm tra nhận thức trực tuyến, đơn giản, an toàn, dễ quản trị, chạy được thực tế ở môi trường local.

> Plan này đã được điều chỉnh theo công nghệ của source hiện có (JavaScript + Express + Knex + Ant Design). Khi plan và `AI_RULES.md` khác nhau về công nghệ/cấu trúc, làm theo plan này rồi cập nhật `AI_RULES.md` trong cùng phiên.

## 0. Cách làm việc

- Làm lần lượt từng giai đoạn ở mục 14. Sau mỗi giai đoạn: báo cáo file đã tạo, cách chạy thử, kết quả test, rồi DỪNG và chờ tôi xác nhận mới làm tiếp.
- Không tự suy diễn nội dung câu hỏi, đáp án. Chỗ nào không rõ phải hỏi lại.
- Giao diện, thông báo lỗi, file Excel mẫu và file xuất đều bằng tiếng Việt, UTF-8. Thời gian lưu UTC, hiển thị theo Asia/Ho_Chi_Minh.
- Tuân thủ `AGENTS.md` và `AI_RULES.md`: tách route/controller/validator/service theo module, lỗi qua `AppError`/`httpError`, audit log cho thao tác thêm/sửa/xóa, cURL theo module trong `backend/curl/`.

## 1. Công nghệ (theo source hiện có)

- Frontend: React 19 + Vite + JavaScript (JSX) + Ant Design 6 + Tailwind CSS 4. Server state dùng TanStack React Query (hook trong `src/hooks/`), HTTP qua Axios dùng chung `src/api/httpClient.js` (tự gắn CSRF token).
- Backend: Node.js + Express 5, JavaScript CommonJS. Tổ chức theo module `src/modules/<module>/` gồm `*.routes.js`, `*.controller.js`, `*.validator.js`, `*.service.js` (và `*.policy.js` khi cần).
- Database: MySQL 8 (InnoDB, utf8mb4, collation utf8mb4_unicode_ci) + Knex (mysql2) + migration Knex trong `backend/src/database/migrations/`. Cấu hình bằng các biến `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` trong `backend/.env` (không dùng DATABASE_URL). Kết nối luôn chạy UTC (`src/config/mysql-connection.js`).
- Authentication: đã có sẵn. Cookie HttpOnly chứa JWT ký HS256, `jti` là id bản ghi trong bảng `auth_sessions`. Mỗi request kiểm tra phiên trong database (còn hạn, chưa thu hồi, tài khoản còn hoạt động, `token_version` khớp), nên đăng xuất/khóa tài khoản/đổi mật khẩu có hiệu lực ngay như session phía server. CSRF token ký HMAC gửi qua header `X-CSRF-Token`.
- Mật khẩu: Argon2id trong `src/utils/password-hash.js`, dùng package `hash-wasm` (WebAssembly, không cần biên dịch native) để chạy được trên shared hosting; hash định dạng PHC tương thích với hash do package `argon2` native tạo trước đây.
- Import/Export Excel: ExcelJS chạy ở backend (thêm dependency `exceljs` vào backend). Upload file bằng `multer` memory storage + kiểm tra định dạng bằng `file-type` (đã có trong backend).
- Validation: validator thuần theo từng module (`*.validator.js`), dùng helper sẵn có `src/utils/validation.js`, `password-policy.js`; dữ liệu sai trả `422` kèm thông báo tiếng Việt. Không thêm Zod.
- Test: `node:test` + `node:assert` (built-in). Test HTTP chạy app thật bằng `app.listen(0)` + `fetch` (mẫu `src/app.security.test.js`); không thêm Vitest/Supertest. Test cần database đặt tên `*.integration.test.js`, chạy bằng `pnpm test:database` trên database riêng (ví dụ `exam_test`).
- Job định kỳ: `setInterval` trong tiến trình Node, có cờ chống chạy chồng và `unref()`.

Không dùng microservices, Redis hay thành phần không cần thiết. Docker và triển khai làm ở giai đoạn 13 (xem mục 15); trước đó giả định MySQL đã chạy sẵn ở máy local. Các file Docker/Caddy/deploy hiện có (`compose*.yaml`, `deploy/`, `docs/DEPLOY_VPS_DOCKER.md`, `backend/scripts/setup-deploy.js`, `tests/`) là của hệ thống cũ, chưa dùng và sẽ viết lại ở giai đoạn triển khai.

## 2. Vai trò người dùng

Chỉ có hai vai trò cố định, lưu trực tiếp ở cột `users.role` (`ADMIN`, `USER`). Không có ma trận quyền hay phạm vi đơn vị. Backend phân quyền bằng middleware `authenticate` + `requireAdmin` / `requireRole(...)` (`src/middlewares/auth.middleware.js`).

ADMIN:
- Quản lý tài khoản quản trị đơn giản (người dự thi không có tài khoản): tạo, sửa (họ tên, vai trò, mật khẩu), khóa/mở khóa, xóa mềm. Không có tự đăng ký. Hỗ trợ import tài khoản Excel với xem trước/xác nhận, chỉ tạo mới, không ghi đè. Mật khẩu tối thiểu 6 ký tự, cho phép chứa tên tài khoản và không giới hạn 72 byte.
- Import và quản lý câu hỏi của từng đợt.
- Tạo và quản lý các đợt kiểm tra.
- Cấu hình số câu, thời gian, số lượt thi tối đa, ngưỡng đạt.
- Xem báo cáo và xuất kết quả Excel.

USER (người dự thi):
- Không có tên đăng nhập/mật khẩu, không tự đăng ký, không đăng nhập bằng mật khẩu. Màn vào thi chỉ có 3 trường bắt buộc: Họ và tên, Đảng bộ, Chi bộ.
- Lần đầu nhập, Backend tự tạo bản ghi người dự thi (role `USER`, mật khẩu ngẫu nhiên nội bộ không phát hành) và mở phiên cookie như hiện có.
- Nhập lại cùng bộ ba thông tin thì tiếp tục cùng người, giữ lịch sử và giới hạn lượt; chuẩn hóa Unicode NFC, khoảng trắng và hoa/thường, vẫn phân biệt dấu tiếng Việt.
- Chỉ ADMIN đăng nhập bằng tên đăng nhập/mật khẩu.
- Xem danh sách đợt kiểm tra.
- Bắt đầu hoặc tiếp tục phiên đang làm.
- Làm bài và nộp bài.
- Xem kết quả Đạt/Không đạt.
- Xem lịch sử các lượt kiểm tra.

Bước đầu chưa làm (áp dụng cho tài khoản quản trị): bắt đổi mật khẩu lần đầu, tự đổi mật khẩu, quên mật khẩu. Admin đặt lại mật khẩu bằng cách sửa tài khoản. Khi Admin đổi mật khẩu, khóa hoặc xóa mềm tài khoản: tăng `token_version` và thu hồi mọi phiên của tài khoản đó.

## 3. Câu hỏi của từng đợt

Câu hỏi thuộc riêng từng đợt kiểm tra, không có ngân hàng dùng chung. Luồng quản trị: tạo đợt (Nháp) → thêm/import câu hỏi vào đợt → mở đợt. Mỗi câu có `exam_round_id`; câu của đợt này không xuất hiện ở đợt khác. Muốn dùng lại câu của đợt cũ thì xuất Excel câu hỏi của đợt đó rồi import vào đợt mới.

`nhom_cau_hoi` (chuyên đề) là thuộc tính văn bản của câu trong phạm vi đợt, dùng để gom câu khi làm bài, lọc và thống kê; không phải danh mục dùng chung.

Import file Excel với các trường:
ma_cau_hoi, nhom_cau_hoi, noi_dung, lua_chon_a, lua_chon_b, lua_chon_c, lua_chon_d, dap_an_dung

Cột tùy chọn cho_phep_xao_tron. Tên cột Excel được ánh xạ về các trường nội bộ tương ứng; tiếp tục hỗ trợ mẫu tiếng Anh cũ.

- Hỗ trợ 2 đến 4 lựa chọn; các cột lua_chon_c/lua_chon_d (option_c/option_d) có thể bỏ hẳn hoặc để trống khi không dùng. Có D phải có C.
- Mỗi câu chỉ có một đáp án đúng; correct_answer phải trỏ tới lựa chọn có tồn tại.
- question_code là duy nhất trong một đợt (unique theo exam_round_id + question_code); hai đợt khác nhau được dùng cùng mã.
- Mỗi câu có cờ allowShuffleOptions (mặc định true). Câu có lựa chọn kiểu "A và B đúng", "Tất cả các đáp án trên" phải đặt false để giữ nguyên thứ tự lựa chọn.

Admin quản lý câu hỏi trong tab "Câu hỏi" của trang chi tiết đợt (không còn trang Ngân hàng câu hỏi riêng trên menu):
- Tải file Excel mẫu (backend sinh bằng ExcelJS).
- Import vào đợt đang xem, xem trước dữ liệu, xem lỗi theo từng dòng (chỉ import khi người dùng xác nhận; import trong một transaction Knex).
- Xuất Excel câu hỏi của đợt theo đúng định dạng mẫu (để sao lưu hoặc import sang đợt khác).
- Thêm, sửa, vô hiệu hóa (xóa mềm), tìm kiếm câu hỏi và lọc theo nhóm trong đợt.
- Thấy số câu hợp lệ hiện có so với số câu mỗi bài.
- Câu chưa từng xuất hiện trong lượt thi nào được xóa hẳn; câu đã dùng chỉ được vô hiệu hóa. Sửa câu sau khi đã có lượt thi chỉ ảnh hưởng các lượt tạo sau (lượt cũ dùng snapshot).

Luồng import: `POST /api/admin/exam-rounds/:id/questions/import` với `mode=preview` (không ghi, trả lỗi theo dòng) và `mode=commit` (tất cả hoặc không). Nếu câu hỏi của đợt đã đổi giữa lúc xem trước và xác nhận gây xung đột (ví dụ trùng mã mới phát sinh) thì trả `409`.

Dữ liệu câu hỏi ban đầu do tôi tự chuẩn bị trong file Excel đúng định dạng trên và nhập qua chức năng import. AI không chuyển đổi tài liệu nguồn, không tự tạo hay tự import bộ câu hỏi thật.

## 4. Quản lý đợt kiểm tra

Bảng `exam_rounds`:
id, title, description, question_count, duration_minutes, max_attempts, passing_percentage (mặc định 70), stop_after_pass (mặc định false), show_correct_answers (mặc định true), shuffle_questions, shuffle_options, start_at, end_at, status (DRAFT, OPEN, CLOSED), created_at, updated_at.

Đợt Nháp được tạo khi chưa có câu hỏi nào; câu hỏi thêm sau trong tab Câu hỏi của đợt (mục 3).

Quy tắc:
- Không cho chuyển sang OPEN nếu số câu hỏi hợp lệ (chưa vô hiệu hóa) của đợt ít hơn question_count. Không cho vô hiệu hóa/xóa câu làm đợt đang OPEN thiếu câu.
- Xóa đợt: chỉ khi chưa có lượt thi; xóa kèm toàn bộ câu hỏi của đợt trong cùng transaction.
- Đợt OPEN nhưng ngoài khoảng start_at–end_at thì không cho bắt đầu lượt mới.
- Khi đã có lượt thi, mọi chỉnh sửa cấu hình chỉ áp dụng cho các lượt tạo SAU đó. Mỗi attempt lưu `config_snapshot` (cột JSON: questionCount, durationMinutes, passingPercentage, showCorrectAnswers, shuffle...) tại thời điểm bắt đầu và luôn dùng snapshot này để chấm và hiển thị.
- expires_at của lượt = min(started_at + duration_minutes, end_at của đợt nếu có).

Chế độ chạy thử (theo từng đợt):
- Thêm cột `trial_start_at` (nullable) vào `exam_rounds` (sửa thẳng migration nền, xem mục 10). Đợt OPEN và thời điểm hiện tại nằm trong [trial_start_at, start_at) thì lượt bắt đầu lúc đó là lượt chạy thử (`attempts.is_trial = 1`).
- Lượt chạy thử đi đúng luồng thi thật (sinh đề, lưu đáp án, chấm, kết quả) nhưng tách hẳn khỏi số liệu chính thức: số lượt thử đếm riêng (không trừ vào max_attempts chính thức), không vào kết quả cuối cùng, dashboard, báo cáo, thống kê từng câu và file xuất (trừ khi Admin chọn xem dữ liệu thử). expires_at của lượt thử không vượt quá start_at.
- Giao diện người thi và Admin hiện rõ nhãn "Chạy thử" trên đợt, màn làm bài và màn kết quả.
- Admin có chức năng "Xóa dữ liệu chạy thử" của một đợt: chỉ xóa các attempt có is_trial = 1 (và attempt_questions/attempt_answers của chúng) trong một transaction, có xác nhận và ghi audit log. Đây là ngoại lệ duy nhất cho phép xóa cứng lượt thi; không bao giờ xóa lượt chính thức.

## 5. Quản lý số lượt thi

Đây là nghiệp vụ bắt buộc.

Mỗi người dự thi (xác định theo bộ ba Họ và tên + Đảng bộ + Chi bộ đã chuẩn hóa) được làm tối đa max_attempts lượt trong mỗi đợt.

1. Khi bắt đầu lượt mới, Backend kiểm tra số lượt đã sử dụng.
2. Nếu số lượt đã dùng >= max_attempts, từ chối tạo lượt mới.
3. Nếu đang có lượt IN_PROGRESS, trả về lượt đó thay vì tạo mới.
4. Reload trang, mất mạng, nhập lại thông tin, đóng trình duyệt không làm tăng số lượt.
5. Mỗi lượt đã tạo hợp lệ tính là một lượt đã sử dụng.
6. Khi nộp bài, phiên chuyển SUBMITTED.
7. Khi hết giờ, phiên chuyển EXPIRED và được tự động chấm.
8. Không cho sửa câu trả lời sau khi phiên kết thúc.
9. Không cho một người có hai phiên IN_PROGRESS cùng một đợt.
10. Kiểm tra và tạo lượt trong database transaction, chống race condition khi nhiều request đồng thời.
11. stop_after_pass=true: không cho tạo lượt mới khi đã có ít nhất một lượt Đạt.
12. stop_after_pass=false: vẫn cho thi tiếp trong giới hạn max_attempts.
13. Không cho tạo lượt mới khi đợt đã đóng.

Chống race condition với MySQL + Knex, bắt buộc:
- Tạo lượt trong `db.transaction(async (trx) => ...)` (InnoDB). Đầu transaction khóa dòng User của người đang thi bằng `trx("users").where({ id }).forUpdate().first()`, để các request start đồng thời của cùng một người được xử lý tuần tự. Sau khi lấy khóa mới đếm số lượt, kiểm tra lượt IN_PROGRESS và tạo lượt mới. Mọi truy vấn trong luồng đều dùng `trx`.
- Unique index (user_id, exam_round_id, is_trial, attempt_number); lượt chạy thử và lượt chính thức đánh số riêng.
- Cột phụ `in_progress_flag` (TINYINT, nullable): đặt 1 khi attempt là IN_PROGRESS, đặt NULL khi phiên kết thúc. Unique index (user_id, exam_round_id, in_progress_flag) để database tự chặn hai phiên IN_PROGRESS (MySQL cho phép nhiều giá trị NULL trong unique index). Tạo bằng migration Knex.
- Bắt lỗi vi phạm unique (`ER_DUP_ENTRY`, errno 1062) và trả về lượt đang có hoặc lỗi hết lượt (`409`), không trả lỗi 500.
- Khi chấm bài/hết giờ, dùng UPDATE có điều kiện (`WHERE status = 'IN_PROGRESS'`, kiểm tra số dòng bị ảnh hưởng) hoặc `forUpdate()` trên dòng attempt để đảm bảo mỗi lượt chỉ chấm đúng một lần.

Tự động hết giờ, không phụ thuộc trình duyệt:
- Job định kỳ trong tiến trình Node (`setInterval`, ví dụ 30 giây/lần, có cờ chống chạy chồng, `unref()`, tắt được bằng biến môi trường và không chạy khi migration/test) quét các lượt IN_PROGRESS đã quá expires_at, chuyển EXPIRED và chấm. Khởi động job trong `src/app/server.js`.
- Đồng thời chốt lười: mọi request tới lượt đã quá hạn đều chốt và chấm lượt đó trước khi xử lý.
- Hai cơ chế dùng chung một hàm chấm, đảm bảo mỗi lượt chỉ chấm đúng một lần (idempotent).
- Cho phép sai lệch nộp trễ tối đa vài giây (hằng số cấu hình) do độ trễ mạng.

## 6. Random câu hỏi và đáp án

Khi bắt đầu lượt thi:
- Backend chọn ngẫu nhiên đúng question_count câu trong các câu hợp lệ của đợt, không trùng (dùng `crypto.randomInt`, không dùng `Math.random`).
- Xáo trộn thứ tự câu hỏi (nếu shuffle_questions) và vị trí lựa chọn (nếu shuffle_options và câu có allow_shuffle_options=true).
- Lưu snapshot đề thi vào `attempt_questions` (question_id gốc, tên nhóm câu hỏi, nội dung, thứ tự lựa chọn kèm khóa phương án gốc A/B/C/D, đáp án đúng). Khóa phương án gốc dùng cho thống kê từng câu khi đã đảo phương án.
- Đáp án đúng chỉ lưu ở Backend. Frontend chỉ nhận nội dung câu hỏi và các lựa chọn.
- Không gửi correctAnswer hoặc isCorrect về Frontend trước khi phiên kết thúc.

Mỗi lượt có đề riêng, không bắt buộc tránh trùng câu giữa các lượt.

### Cơ cấu đề (thay cho chia đề / bộ đề tạo trước, áp dụng từ giai đoạn 11)

Mỗi lượt thi luôn sinh đề ngẫu nhiên riêng tại thời điểm bắt đầu (không có bộ đề tạo trước). Mỗi đợt có một "Cơ cấu đề" với hai lựa chọn:
- RANDOM — Lấy ngẫu nhiên toàn bộ: Admin nhập "Số câu mỗi đề"; lấy ngẫu nhiên từ mọi câu hợp lệ của đợt. Ví dụ 300 câu, đề 50 câu.
- BY_GROUP — Lấy theo từng nghị quyết: bảng tự liệt kê mọi nhóm (category_name, chuẩn hóa NFC/khoảng trắng/hoa-thường, giữ phân biệt dấu) có trong câu hỏi của đợt, mỗi dòng gồm tên nghị quyết, số câu hợp lệ hiện có và "Lấy mỗi đề" (số nguyên ≥ 0; 0 = không lấy nhóm đó). Ô "Mỗi nghị quyết lấy [k] câu" + nút "Áp dụng cho tất cả" điền nhanh cả bảng, sau đó sửa riêng từng dòng. Ví dụ 10 nghị quyết × 10 câu, mỗi nghị quyết lấy 3 → đề 30 câu.

Quy tắc:
- question_count của đợt do cơ cấu quyết định: RANDOM lấy số Admin nhập; BY_GROUP = tổng cột "Lấy mỗi đề" (Backend tự tính, không nhận giá trị lệch từ client). Form Sửa đợt không còn ô số câu; số câu hiển thị ở thông tin đợt.
- Kiểm tra ngay trên từng dòng: lấy nhiều hơn số câu hợp lệ hiện có thì báo lỗi dòng; tổng phải ≥ 1. Không cho lưu khi có lỗi. Mở đợt (và nút Mở nhanh) kiểm tra lại đủ câu theo cơ cấu ở Backend; vô hiệu hóa/xóa câu làm một nhóm hoặc tổng thiếu câu khi đợt OPEN bị chặn.
- Nhóm mới xuất hiện sau khi lưu cơ cấu (import thêm) mặc định lấy 0 câu và được làm nổi trong bảng để Admin quyết định.
- Thứ tự câu trong đề: BY_GROUP giữ thứ tự nghị quyết theo thứ tự dòng trong bảng (mặc định sắp xếp tự nhiên theo tên, "số 2" trước "số 10"; Admin đổi được bằng nút lên/xuống); shuffle_questions chỉ đảo câu bên trong từng nghị quyết. RANDOM: shuffle_questions đảo toàn bộ đề. shuffle_options giữ nguyên quy tắc cũ.
- Cơ cấu bị khóa khi đợt đã có ít nhất một lượt chính thức (lượt chạy thử không khóa; xóa dữ liệu chạy thử không ảnh hưởng). Thông báo một câu: "Đợt đã có người thi, không thay đổi được cơ cấu đề". Muốn đổi dùng đợt mới.
- "Xem thử 1 đề mẫu": Backend sinh một đề theo cơ cấu đang nhập (chưa cần lưu), trả về cho ADMIN để xem kèm đáp án đúng, không lưu database, không tạo lượt, có audit log.
- Lượt thi lưu cơ cấu đã dùng trong config_snapshot. Không thay chấm điểm, giới hạn lượt, chạy thử hoặc snapshot lịch sử.


## 7. Làm bài

Giao diện làm bài (Ant Design, giữ layout desktop/mobile hiện có) có:
- Tên đợt kiểm tra, đồng hồ đếm ngược.
- Câu hỏi, các lựa chọn, chọn một đáp án.
- Nút câu trước/sau.
- Danh sách câu đã trả lời/chưa trả lời, gom theo nhóm câu hỏi (lấy từ snapshot): trên máy tính nằm bên cạnh câu hỏi; trên điện thoại mở bằng ngăn kéo từ thanh điều hướng cố định ở đáy màn hình (‹ Câu trước · "12/30" · Câu sau ›). Thứ tự nhóm giữ theo thứ tự câu trong đề.
- Lưu đáp án theo mô hình "giữ trên máy, gửi ngầm theo lô, nộp gửi toàn bộ" (giai đoạn 12):
  - Chọn đáp án cập nhật giao diện ngay, không chờ mạng, không hiện trạng thái lưu sau từng lần bấm.
  - Lựa chọn được lưu tạm trong `sessionStorage` theo mã lượt (chỉ `{attemptQuestionId: A/B/C/D|null}`, thời điểm sửa, hạn chót lượt); không lưu nội dung câu hỏi hay đáp án đúng. Xóa khi nộp xong, khi phát hiện lượt đã chốt, khi đăng xuất và khi quá hạn chót.
  - Khi mở lại trang: lấy lựa chọn từ Backend rồi áp lựa chọn mới hơn trong `sessionStorage`; câu khác Backend đưa vào hàng chờ gửi.
  - Gửi ngầm khoảng 30 giây/lần, chỉ các câu đã đổi (gom theo lô), và ngay khi trang bị ẩn (`visibilitychange`/`pagehide`, `fetch` keepalive). Lô lỗi để lô sau gửi bù, không hiện lỗi giữa màn.
  - Trạng thái lưu chỉ là một biểu tượng nhỏ cạnh đồng hồ: "Đã lưu" / "Chưa đồng bộ – sẽ gửi khi nộp" (kèm số câu); mất mạng đổi biểu tượng, không chèn Alert đẩy nội dung.
- Nút nộp bài kèm xác nhận: nêu số câu chưa trả lời và liệt kê số thứ tự các câu đó (bấm để quay lại đúng câu), câu chưa trả lời tính là sai.
- Nộp bài gửi toàn bộ đáp án trong một request; Backend ghi đáp án và chấm trong cùng transaction. Trong lúc nộp hiện màn chờ "Đang nộp bài…"; nộp hoặc tự chốt xong chuyển thẳng tới `/attempts/:id/result` (thay thế lịch sử, Back không quay lại màn làm bài); màn kết quả hiện dòng "Đã nộp bài lúc …" hoặc "Hết giờ, hệ thống đã tự chốt bài" và cảnh báo nếu có lựa chọn chưa kịp ghi nhận.
- Tùy chọn "Tự sang câu sau khi chọn" (công tắc, mặc định bật trên điện thoại, nhớ theo trình duyệt).
- Dưới câu hỏi: "Câu sau" là nút chính bên phải, "Câu trước" bên trái, "Bỏ chọn" là liên kết nhỏ tách khỏi nút điều hướng.
- Nhớ vị trí câu đang xem trong `sessionStorage` theo mã lượt để F5 quay lại đúng câu.
- Nhắc nhở khi còn 10 phút và 5 phút (mỗi mốc một lần), đồng hồ đổi màu cảnh báo từ mốc 10 phút; từ mốc 5 phút giữ một dòng nhắc cố định cạnh đồng hồ.
- Đồng hồ chỉ chỉnh theo thời gian máy chủ khi lệch quá 2 giây (không nhảy giây mỗi lần đồng bộ).
- Báo trạng thái mạng bằng biểu tượng cạnh đồng hồ (xem mục lưu đáp án). Mọi thông báo của màn làm bài (mất mạng, lỗi nộp, hết giờ) hiển thị ở một vị trí cố định trên thanh trên cùng, không đẩy nội dung câu hỏi.
- Request lưu dùng thời gian chờ khoảng 30 giây, request nộp khoảng 60 giây (riêng cho màn làm bài, không đổi timeout chung). Nộp bài tự thử lại khi lỗi mạng (thử lại vài lần, giãn cách tăng dần); hết số lần thử thì hiện nút "Nộp lại". Lỗi nghiệp vụ (đã nộp, hết giờ đã tự chốt) không thử lại mà chuyển sang màn kết quả. Nộp bài phía Backend idempotent nên thử lại không tạo lượt hay chấm lại.
- Phím tắt trên máy tính: ←/→ chuyển câu, A/B/C/D chọn phương án; không kích hoạt khi đang mở hộp thoại hoặc đang gõ trong ô nhập.

F5 hoặc nhập lại đúng Họ và tên, Đảng bộ, Chi bộ phải khôi phục phiên đang làm và các đáp án đã lưu. Đồng hồ Frontend chỉ để hiển thị, Backend quyết định thời điểm hết hạn (đồng bộ thời gian còn lại từ server). Không lưu đề, nội dung câu hỏi hoặc đáp án đúng ở trình duyệt; không dùng localStorage cho dữ liệu bài làm. Chỉ được lưu tạm lựa chọn của người thi và vị trí câu trong `sessionStorage` theo quy tắc trên.

Rủi ro chấp nhận: máy tắt hẳn hoặc hết giờ đúng lúc mất mạng thì chỉ mất các lựa chọn sau lần gửi ngầm gần nhất (tối đa khoảng 30 giây làm bài); phần đã gửi vẫn được Backend tự chốt và chấm.

## 8. Chấm điểm

- Tổng số câu = questionCount (theo snapshot).
- Tỷ lệ đúng = correctCount / questionCount * 100.
- Câu bỏ trống tính là sai.

ĐẠT nếu: correctCount * 100 >= passingPercentage * questionCount
KHÔNG ĐẠT trong các trường hợp còn lại.

Ví dụ 20 câu, ngưỡng 70%: 13 câu đúng là Không đạt; 14 câu đúng là Đạt.

Chỉ dùng phép so sánh số nguyên như trên, không dùng số phần trăm đã làm tròn hoặc số thực để xét Đạt.

Khi chấm lưu: correct_count, incorrect_count, unanswered_count, percentage, result (PASS/FAIL), submitted_at, duration_seconds. Mỗi lượt chấm đúng một lần.

## 9. Kết quả từng lượt và kết quả cuối cùng

Kết quả từng lượt:
- Tỷ lệ đúng; số câu đúng, sai, chưa trả lời; Đạt/Không đạt.
- Chi tiết từng câu và đáp án người dùng đã chọn.
- Đáp án đúng chỉ hiển thị sau khi phiên kết thúc và khi showCorrectAnswers=true (theo snapshot).

Kết quả cuối cùng của người dùng trong đợt (dùng tên riêng, không trùng trạng thái của attempt):
- PASSED: có ít nhất một lượt PASS.
- FAILED: không có lượt PASS và đã hết lượt hoặc đợt đã đóng.
- IN_PROGRESS_ROUND: chưa PASS nhưng vẫn còn khả năng thi (còn lượt, đợt còn mở).
- NOT_STARTED: chưa có lượt nào.

Lưu toàn bộ lịch sử lượt thi, không ghi đè kết quả cũ.

## 10. Database

Migration Knex tối thiểu (tên bảng/cột snake_case, API trả camelCase): `users`, `auth_sessions`, `exam_rounds`, `questions`, `attempts`, `attempt_questions`, `attempt_answers`.

- Khóa chính: UUID `CHAR(36)` sinh bằng `src/utils/uuid.js` (thống nhất với auth hiện có).
- `users`: id, username (unique), full_name, password_hash, role (`ADMIN`/`USER`), is_active, token_version, last_login_at, deleted_at, created_at, updated_at; bổ sung party_committee, party_branch, participant_key (unique nullable) bằng migration mới. Người dự thi có username nội bộ `participant_<id>` (không hiển thị, không dùng để đăng nhập). Tên tài khoản đã xóa mềm vẫn giữ unique (không tái sử dụng) để lịch sử thi không bị nhầm người.
- `auth_sessions`: giữ đúng các cột mà `src/modules/auth/auth-sessions.service.js` đang dùng: id, public_id, user_id, token_version, ip_address, user_agent, browser, operating_system, device_type, expires_at, last_seen_at, revoked_at, revoked_by, revoke_reason, created_at.
- `attempts` lưu: user_id, exam_round_id, is_trial (TINYINT, mặc định 0, xem mục 4), attempt_number, started_at, expires_at, submitted_at, status (IN_PROGRESS, SUBMITTED, EXPIRED), in_progress_flag (xem mục 5), correct_count, incorrect_count, unanswered_count, percentage, result, duration_seconds, config_snapshot (JSON).
- `questions`: id, exam_round_id (FK exam_rounds), question_code, category_name (nhóm/chuyên đề, varchar), content, option_a..option_d, correct_answer, allow_shuffle_options, deleted_at, created_at, updated_at; unique (exam_round_id, question_code); index (exam_round_id, deleted_at). Bỏ bảng `question_categories` và `exam_round_categories`.
- `attempt_questions` lưu snapshot câu hỏi, thứ tự lựa chọn và đáp án đúng. `attempt_answers` unique theo (attempt_id, attempt_question_id).

Dùng InnoDB, utf8mb4, collation utf8mb4_unicode_ci để tìm kiếm tiếng Việt có dấu đúng. Tạo migration Knex cho MySQL, có `down` đầy đủ. Tạo index, unique constraint và foreign key phù hợp. Database hiện chưa dùng thật, chưa có dữ liệu cần giữ: được sửa thẳng các migration hiện có (`202611100001_foundation.js`, `202611110001_participant_identity.js`) thay vì tạo migration bổ sung, rồi chạy lại từ đầu (`pnpm migrate:rollback --all` hoặc tạo lại database, sau đó `pnpm migrate`). Không cần tương thích migration cũ. Quy tắc này chỉ áp dụng đến khi hệ thống chạy thật; từ lúc có dữ liệu thật mọi thay đổi schema phải là migration mới, không xóa/ghi đè dữ liệu.

Sửa hoặc xóa mềm câu hỏi của đợt không được làm thay đổi kết quả lịch sử.

## 11. API

Định dạng theo `AI_RULES.md`: JSON camelCase; `401` chưa đăng nhập, `403` sai vai trò, `404` không tìm thấy, `409` xung đột trạng thái (hết lượt, đợt đóng, đã nộp...), `422` dữ liệu sai; mọi request ghi (POST/PUT/PATCH/DELETE) cần header `X-CSRF-Token`. Danh sách phân trang qua `src/utils/pagination.js`. Mỗi nhóm API có file cURL riêng trong `backend/curl/`.

Authentication (đã có):
- POST /api/auth/login (đăng nhập tài khoản quản trị; giữ tương thích API tài khoản cũ)
- POST /api/auth/enter (người dự thi, không mật khẩu: fullName, partyCommittee, partyBranch)
- POST /api/auth/logout
- GET /api/auth/me

User:
- GET /api/exam-rounds
- GET /api/exam-rounds/:id
- POST /api/exam-rounds/:id/start
- GET /api/attempts/:id
- PUT /api/attempts/:id/answers
- POST /api/attempts/:id/submit (body tùy chọn `answers: [{attemptQuestionId, selectedAnswer}]`, ghi cùng transaction với chấm; vẫn chặn khi quá hạn + sai lệch cho phép; gọi lại idempotent)
- GET /api/attempts/:id/result
- GET /api/my-results

Admin (`requireAdmin`):
- CRUD /api/admin/users
- GET /api/admin/questions/template
- CRUD /api/admin/exam-rounds/:id/questions, POST /api/admin/exam-rounds/:id/questions/import, GET /api/admin/exam-rounds/:id/questions/export
- CRUD /api/admin/exam-rounds
- GET /api/admin/exam-rounds/:id/results
- GET /api/admin/exam-rounds/:id/statistics
- GET /api/admin/exam-rounds/:id/question-statistics (thống kê từng câu)
- DELETE /api/admin/exam-rounds/:id/trial-data (xóa dữ liệu chạy thử)
- GET /api/admin/exam-rounds/:id/export

Mọi API xác thực và phân quyền tại Backend.

## 12. Báo cáo

Dashboard theo từng đợt:
- Tổng số người tham gia (người có ít nhất một lượt).
- Số người Đạt, Không đạt, chưa hoàn thành.
- Tỷ lệ Đạt.
- Tổng số lượt thi.
- Số lượt thi trung bình mỗi người.

Bảng chi tiết: họ tên, đảng bộ, chi bộ, đợt kiểm tra, số lượt đã dùng / tối đa, điểm cao nhất, kết quả cuối cùng, thời gian tham gia gần nhất. Cho phép lọc và xuất Excel (backend ExcelJS).

Không tính số lượt thi thành số người tham gia.

Thống kê từng câu (theo đợt, chỉ tính lượt chính thức đã chốt; lọc được theo đảng bộ):
- Mỗi câu hỏi gốc (theo question_id trong snapshot): mã câu, nhóm, nội dung, số lượt gặp câu, số lượt trả lời đúng, tỷ lệ đúng.
- Số lượt chọn từng phương án gốc A/B/C/D và số lượt bỏ trống (quy đổi về khóa phương án gốc nên vẫn đúng khi đã đảo phương án).
- Sắp xếp được theo tỷ lệ đúng để tìm câu khó/dễ; dùng nội dung trong snapshot nên câu đã sửa/xóa mềm vẫn thống kê đúng.
- File Excel xuất của đợt có thêm sheet "Theo câu hỏi".

Mặc định mọi số liệu dashboard, báo cáo, thống kê và file xuất chỉ tính lượt chính thức; Admin có thể chọn xem riêng dữ liệu chạy thử.

Kịch bản thử tải: script `backend/scripts/load-test.js` (chạy bằng `pnpm load-test`, tham số tổng số lượt và số người đồng thời) giả lập nhiều người vào thi, bắt đầu, lưu đáp án và nộp bài cùng lúc qua API thật; báo thời gian phản hồi (trung bình, p95), số lỗi theo loại, và kiểm tra không có người nào vượt số lượt hoặc có hai lượt IN_PROGRESS. Script chỉ chạy khi đợt đích đang ở chế độ chạy thử (từ chối nếu không) để không lẫn dữ liệu chính thức; chạy xong dùng "Xóa dữ liệu chạy thử".

## 13. Bảo mật và kiểm thử

Bảo mật bắt buộc:
- Mật khẩu hash bằng Argon2id.
- Session cookie HttpOnly, Secure khi chạy HTTPS, SameSite (đã có).
- CSRF protection và rate limiting, đặc biệt cho đăng nhập (đã có, giữ nguyên).
- Phân quyền ADMIN/USER tại Backend.
- Không để lộ đáp án đúng qua API, source Frontend, localStorage/sessionStorage hoặc Network (sessionStorage chỉ chứa lựa chọn của người thi, xem mục 7).
- Chống IDOR: người dùng chỉ xem được phiên và kết quả của mình.
- Không cho đổi đáp án sau khi kết thúc, không nộp lại, không vượt số lượt.
- Validation đầu vào ở `*.validator.js` cho mọi API.
- Dùng transaction khi tạo phiên, chấm bài, import Excel.
- Audit log (`src/utils/audit-log.js`) cho thao tác quản trị: tài khoản, câu hỏi, import, đợt kiểm tra, xuất báo cáo, xóa dữ liệu chạy thử.

Lưu ý: vì cho phép hiển thị đáp án đúng sau khi nộp, hệ thống không ngăn được người đã thi chia sẻ đáp án. Đây là giới hạn nghiệp vụ, không phải lỗi bảo mật.

Kiểm thử (chỉ test logic Backend bằng `node:test`, không cần test giao diện/E2E; test nghiệp vụ chạy trên MySQL thật với database test riêng, ví dụ `exam_test`, qua `pnpm test:database`; test thuần không cần database chạy bằng `pnpm test`):
- Import Excel đúng/sai (thiếu cột, trùng mã, đáp án không hợp lệ, báo lỗi theo dòng).
- Random đủ số câu, không trùng.
- Xáo trộn lựa chọn vẫn chấm chính xác; câu allowShuffleOptions=false giữ nguyên thứ tự.
- Không lộ đáp án trước khi phiên kết thúc.
- Đúng 70% là Đạt; dưới 70% là Không đạt (ví dụ 14/20 Đạt, 13/20 Không đạt).
- maxAttempts = 1, 2, 3 hoạt động đúng.
- Gửi nhiều request start đồng thời không vượt số lượt và không tạo hai phiên IN_PROGRESS.
- Gọi start lại (mô phỏng F5, nhập lại thông tin) không tăng số lượt.
- Hết giờ tự động chấm (cả job định kỳ và chốt lười), chấm đúng một lần.
- Không sửa bài đã nộp hoặc đã hết hạn.
- Không xem được bài người khác.
- stopAfterPass true/false.
- Không bắt đầu được khi đợt đóng hoặc ngoài khung giờ.
- Kết quả cuối PASSED nếu có ít nhất một lượt PASS.
- Chỉnh sửa/xóa mềm câu hỏi của đợt hoặc đổi cấu hình đợt không làm thay đổi kết quả lịch sử.
- Câu hỏi của đợt A không bao giờ xuất hiện trong đề của đợt B; cùng mã câu được dùng ở hai đợt khác nhau.
- Chạy thử: lượt trong khoảng trial_start_at–start_at được đánh dấu thử, không trừ lượt chính thức, không vào báo cáo chính thức; xóa dữ liệu chạy thử không đụng lượt chính thức.
- Thống kê từng câu đếm đúng phương án gốc khi đã đảo phương án.

Frontend có unit test cho hàm thuần của màn làm bài: gom câu theo nhóm, mốc nhắc giờ 10/5 phút, lịch thử lại khi nộp bài.

Frontend kiểm tra bằng `pnpm lint`, `pnpm test` (unit test `node:test` cho hàm thuần) và `pnpm build`, cộng đối chiếu thủ công desktop/tablet/mobile theo checklist UI trong `AI_RULES.md`.

## 14. Thứ tự triển khai

1. Database và Authentication:
   - Migration Knex nền cho toàn bộ bảng ở mục 10.
   - Đổi `password-hash.js` sang Argon2id.
   - CLI tạo Admin đầu tiên: `pnpm create-admin` (script `backend/scripts/create-admin.js`, hỏi username/họ tên/mật khẩu, kiểm tra `password-policy`; từ chối nếu đã có ADMIN trừ khi truyền cờ `--force`).
   - API và màn quản lý tài khoản `/api/admin/users` (tạo, sửa họ tên/vai trò/mật khẩu, khóa/mở khóa, xóa mềm; không cho tự khóa/xóa/hạ quyền admin cuối cùng).
2. Câu hỏi theo đợt: tải Excel mẫu, import/xuất Excel câu hỏi của đợt (xem trước/xác nhận), quản lý câu hỏi trong tab của trang chi tiết đợt.
3. Quản lý đợt kiểm tra (tạo đợt Nháp không cần câu hỏi).
   (Giai đoạn 2–7 đã làm theo mô hình ngân hàng dùng chung; việc chuyển sang câu hỏi theo đợt làm ở giai đoạn 8.)
4. Random đề và quản lý lượt thi (gồm job tự động hết giờ, chế độ chạy thử: thêm `trial_start_at`, `is_trial` vào migration nền).
5. Giao diện làm bài (gồm nhắc giờ, báo mất mạng, nộp lại, gom câu theo nhóm, phím tắt).
6. Chấm điểm và kết quả.
7. Dashboard, thống kê từng câu, xuất Excel và xóa dữ liệu chạy thử.
8. Chuyển câu hỏi sang mô hình theo đợt (mục 3, 4, 10, 11), không đổi nghiệp vụ thi/chấm/báo cáo:
   - Migration nền: `questions` thêm `exam_round_id` (FK), `category_name`; unique (exam_round_id, question_code); bỏ `question_categories`, `exam_round_categories` và FK liên quan. Database chưa dùng thật nên sửa thẳng migration rồi dựng lại.
   - Backend: route câu hỏi chuyển về `/api/admin/exam-rounds/:id/questions` (CRUD, import, xuất Excel; giữ `GET /api/admin/questions/template`); validator đợt bỏ `categoryIds`, đợt Nháp tạo được khi chưa có câu; điều kiện mở đợt đếm câu hợp lệ của chính đợt; không cho vô hiệu hóa/xóa câu làm đợt OPEN thiếu câu; câu chưa dùng được xóa hẳn, câu đã dùng chỉ vô hiệu hóa; xóa đợt (chưa có lượt) xóa kèm câu hỏi.
   - Sinh đề (attempts) lấy câu theo `exam_round_id`; snapshot nhóm lấy từ `category_name`. Báo cáo/thống kê từng câu và Excel đổi nguồn tên nhóm tương ứng, kết quả không đổi.
   - Frontend: bỏ trang/menu Ngân hàng câu hỏi; form đợt bỏ ô chọn nhóm; thêm tab "Câu hỏi" trong trang chi tiết đợt (dùng lại `QuestionFormModal`, `QuestionImportModal`), hiện số câu hợp lệ / số câu mỗi bài, nút xuất Excel.
   - Cập nhật cURL, README, unit/integration test; thêm test: câu đợt A không vào đề đợt B, cùng mã dùng được ở hai đợt, xóa đợt kéo theo câu hỏi, chặn vô hiệu hóa làm đợt OPEN thiếu câu, xuất rồi import sang đợt khác giữ nguyên dữ liệu.
9. Kiểm thử, kịch bản thử tải `pnpm load-test`, rà soát bảo mật, `.env.example`, README hướng dẫn tạo database MySQL (`CREATE DATABASE exam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`), cấu hình `DB_*` trong `backend/.env`, chạy `pnpm migrate`, tạo admin bằng CLI và chạy local.
10. Cải thiện trải nghiệm sử dụng (không đổi nghiệp vụ thi, chấm điểm, snapshot):
   - Xác nhận trước khi bắt đầu lượt: hộp xác nhận hiện tên đợt, số câu, thời lượng, lượt thứ mấy / tối đa, họ tên – đảng bộ – chi bộ của người thi; chỉ gọi start sau khi bấm "Bắt đầu làm bài". Nếu đang có lượt IN_PROGRESS thì nút là "Tiếp tục làm bài", vào thẳng bài không hỏi lại. Thời gian chỉ tính từ khi Backend tạo lượt.
   - Danh sách và chi tiết đợt phía người thi: API trả thêm trạng thái tham gia của chính người đó (lượt chính thức đã dùng / tối đa, còn lại, có lượt đang làm hay không, kết quả cuối, lý do không thể bắt đầu: chưa đến giờ, đã kết thúc, hết lượt, đã đạt khi stopAfterPass). Thẻ đợt hiện các thông tin này; nút bắt đầu bị khóa kèm lý do thay vì bấm rồi báo lỗi. Tiêu đề trang đổi thành "Đợt kiểm tra"; đợt đang thi / chạy thử xếp trước, đợt đã kết thúc xếp sau.
   - Mã QR chuyển sang phía Admin: nút "Mã QR" trên danh sách và chi tiết đợt của Admin (in/tải ảnh QR dẫn tới cổng vào thi). Bỏ nút QR khỏi giao diện người thi.
   - Admin đăng nhập xong vào thẳng /admin/exam-rounds (bỏ trang /home trống cho Admin; USER giữ /exam-rounds).
   - Danh sách đợt của Admin: thêm cột "Câu hợp lệ / số câu mỗi bài" (đánh dấu khi thiếu) và nút nhanh "Mở đợt" / "Đóng đợt" có xác nhận; Mở đợt vẫn qua đúng kiểm tra đủ câu ở Backend và báo lý do khi bị từ chối. Ghi audit log như sửa đợt.
   - Báo cáo tổng hợp theo đảng bộ (tab mới trong báo cáo đợt): mỗi đảng bộ một dòng gồm số người tham gia, số Đạt, Không đạt, chưa hoàn thành, tỷ lệ Đạt, tổng lượt; nhóm theo giá trị đảng bộ đã chuẩn hóa (NFC, khoảng trắng, hoa/thường) để gộp các cách gõ chỉ khác hoa/thường/khoảng trắng; bấm một dòng để lọc bảng người dự thi theo đảng bộ đó. Dùng chung bộ lọc chính thức/chạy thử; file Excel thêm sheet "Theo đảng bộ".
   - Admin xem lịch sử từng lượt của một người: từ bảng người dự thi mở danh sách mọi lượt (chính thức và thử, trạng thái, điểm, thời gian) và xem chi tiết một lượt (câu hỏi, đáp án đã chọn, đáp án đúng theo snapshot). API mới chỉ cho ADMIN (`GET /api/admin/exam-rounds/:id/participants/:userId/attempts`, `GET /api/admin/attempts/:id`), có audit log khi xem chi tiết, không cho sửa.
   - Kiểm tra: test API trạng thái tham gia và lý do khóa nút, quyền ADMIN cho API xem lượt (USER bị 403), tổng hợp theo đảng bộ khớp bảng chi tiết và Excel; unit test hàm thuần frontend (nhãn nút, lý do khóa, sắp xếp đợt); đối chiếu desktop/tablet/mobile theo AI_RULES.md.
11. Đơn giản hóa cơ cấu đề (mục 6 "Cơ cấu đề"), thay cho chia đề 3 chế độ + bộ đề tạo trước:
   - Bỏ "Tạo trước bộ đề" (PREGENERATED), chế độ EQUAL/CUSTOM và mọi API/UI/test liên quan (tạo, xóa, xem bộ đề, papers_locked_at). Database chưa dùng thật: sửa migration `202611130001_round_papers.js` chỉ còn cột `exam_rounds.selection_config` (bỏ bảng `exam_papers`, `papers_locked_at`), rồi dựng lại database dev/test.
   - selection_config mới: `{ mode: 'RANDOM' | 'BY_GROUP', groups: [{ category, count, order }] }`; Backend chuẩn hóa tên nhóm, tính question_count, kiểm tra đủ câu, khóa khi đã có lượt chính thức. Sinh đề mỗi lượt theo cơ cấu (crypto.randomInt), thứ tự câu theo quy tắc mục 6.
   - API: GET cơ cấu kèm danh sách nhóm và số câu hợp lệ từng nhóm; PUT lưu cơ cấu; POST xem thử 1 đề mẫu (ADMIN, không ghi database, audit log). Bỏ questionCount khỏi API tạo/sửa đợt (đợt Nháp mới mặc định RANDOM, số câu nhập trong tab Cơ cấu đề).
   - Frontend: tab "Cơ cấu đề" thay tab "Chia đề" trong chi tiết đợt (ADMIN): radio hai lựa chọn, bảng tự liệt kê nhóm, ô áp dụng nhanh k câu, lỗi theo dòng, tổng số câu mỗi đề, nút lên/xuống thứ tự, nút "Xem thử 1 đề mẫu" (modal), nút Lưu; trạng thái khóa hiển thị một câu. Form Sửa đợt bỏ ô số câu. Cột "Câu hợp lệ / số câu mỗi bài" ở danh sách đợt tính theo cơ cấu.
   - Test: 10 nhóm × 10 câu lấy 3 → đề 30 câu đúng 3 câu/nhóm, không trùng; RANDOM 300 câu lấy 50; nhóm lấy vượt số câu bị từ chối; nhóm 0 câu không xuất hiện; thứ tự nhóm giữ đúng khi đảo câu; khóa sau lượt chính thức, không khóa bởi lượt thử; xem thử không ghi database và USER bị 403; chặn vô hiệu hóa câu làm thiếu cơ cấu khi OPEN; lượt cũ giữ nguyên snapshot. Cập nhật cURL, README, xóa/ghi chú lại PAPERS_REVIEW.md; đối chiếu desktop/tablet/mobile theo AI_RULES.md.
12. Làm bài mượt khi mạng chậm và rút gọn thao tác (mục 7, 11), không đổi chấm điểm, giới hạn lượt, snapshot:
   - Lưu đáp án: giữ trên máy + `sessionStorage` theo mã lượt, gửi ngầm theo lô khoảng 30 giây và khi trang bị ẩn (keepalive), bỏ cơ chế gửi mỗi 0,5 giây và trạng thái lưu sau từng lần bấm; khôi phục/hợp nhất lựa chọn khi mở lại; xóa dữ liệu tạm khi nộp, khi lượt đã chốt, khi đăng xuất, khi quá hạn.
   - Backend: submit nhận kèm toàn bộ đáp án, validate thuộc lượt và phương án hợp lệ, ghi + chấm trong một transaction, chặn quá hạn (cộng sai lệch cho phép), idempotent khi gọi lại; API lưu theo lô giữ nguyên.
   - Timeout riêng: lưu khoảng 30 giây, nộp khoảng 60 giây.
   - Nộp/tự chốt xong chuyển thẳng màn kết quả (replace) với dòng thông báo trạng thái; màn chờ "Đang nộp bài…"; bỏ thẻ "Đã ghi nhận bài nộp" trung gian.
   - Trạng thái lưu/mạng là biểu tượng cạnh đồng hồ; thông báo gom vào vị trí cố định, không đẩy nội dung; đồng hồ chỉ chỉnh khi lệch quá 2 giây; dòng nhắc cố định từ mốc 5 phút.
   - Điện thoại: thanh điều hướng cố định ở đáy (‹ Câu trước · "12/30" · Câu sau ›), danh sách câu mở dạng ngăn kéo. Thứ tự nút: "Câu sau" chính bên phải, "Bỏ chọn" là liên kết nhỏ.
   - Công tắc "Tự sang câu sau khi chọn" (mặc định bật trên điện thoại); hộp xác nhận nộp liệt kê câu chưa trả lời, bấm để quay lại; nhớ vị trí câu khi F5.
   - Test: submit kèm đáp án ghi đúng và chấm đúng một lần; submit lại không đổi kết quả; submit sau hạn bị từ chối, bài được chấm theo đáp án đã gửi trước đó; đáp án không thuộc lượt bị 422; hợp nhất sessionStorage với Backend (bản máy mới hơn thắng, câu đã gửi không gửi lại); xóa sessionStorage đúng các thời điểm; nhịp gửi theo lô; điều hướng sang màn kết quả; tự sang câu; đồng hồ không nhảy khi lệch nhỏ. Người dùng tự thử DevTools "Slow 3G": chọn liên tục không bị trễ, nộp không báo lỗi giả; tự đối chiếu desktop/tablet/mobile. AI không mở browser hoặc tạo DB mới để test, theo chính sách kiểm tra hiện hành trong AI_RULES.md.

13. Triển khai và vận hành cho 1000 người thi đồng thời (mục 15):
   - Rate limit theo đúng thực tế nhiều người chung một IP: API làm bài, danh sách đợt, kết quả, phiếu của người đã vào thi giới hạn theo user id (mặc định 600 request/15 phút/người); giới hạn toàn API theo IP nâng lên và cấu hình được (mặc định 30000/15 phút); vào thi theo IP mặc định 3000/15 phút; giữ chặt đăng nhập Admin và tra cứu phiếu công khai. Mọi giá trị qua biến môi trường, ghi rõ trong `.env.example`. Log có IP thật (TRUST_PROXY đúng số proxy) và log riêng mỗi lần trả 429.
   - Database pool: bỏ giới hạn cứng tối đa 4 trong `knexfile.js`; cho phép đến 50, mặc định production 20; giữ mặc định nhỏ cho dev. Ghi khuyến nghị `max_connections` MySQL.
   - Job tự chốt hết giờ: mỗi lượt chạy xử lý lặp theo lô 100 cho đến khi hết lượt quá hạn (có giới hạn thời gian mỗi lượt chạy, vẫn chống chạy chồng), để 1000 lượt hết giờ cùng lúc được chốt trong khoảng 1 phút; test logic lặp.
   - Docker Compose viết lại theo source hiện tại (bỏ cấu hình hệ thống cũ: ticket, bootstrap token, tên hts): `db` (MySQL 8, volume, healthcheck, utf8mb4), `migrate` (chạy `pnpm migrate` rồi thoát), `backend` (một bản duy nhất, restart unless-stopped, healthcheck `/api/health`), `web` (Caddy phục vụ frontend build và proxy `/api`, HTTPS tự động khi có tên miền). Chạy được trên VPS hoặc máy chủ nội bộ có Docker. `.env.production.example` đủ biến, có giải thích, không chứa secret thật.
   - Sao lưu/khôi phục: script `deploy/backup.sh` (mysqldump nén, giữ N bản, chạy bằng cron hằng ngày và chạy tay trước/sau ngày thi) và `deploy/restore.sh` (khôi phục vào database chỉ định, hỏi xác nhận, từ chối ghi đè database có dữ liệu nếu không truyền cờ rõ ràng). Hướng dẫn đưa bản sao lưu ra máy khác.
   - Kịch bản thử tải `pnpm load-test` bổ sung: 1000 người ảo, tăng dần trong 5 phút, làm bài với nhịp gửi ngầm thật, 1000 lượt nộp dồn trong 2 phút cuối, mô phỏng nhóm 100 người chung một IP; báo p50/p95/p99, tỉ lệ lỗi theo mã (đặc biệt 429, 5xx), số lượt vượt giới hạn hoặc IN_PROGRESS kép (phải bằng 0). Ngưỡng đạt: lỗi < 0,5%, p95 lưu < 1 giây, p95 nộp < 3 giây.
   - (Đã bỏ sau giai đoạn 17 theo yêu cầu: trang hướng dẫn, API `/public/guide`, `/admin/guide`, `APP_SETTINGS_FILE`; hướng dẫn phát cho người thi do Ban tổ chức tự soạn kèm Mã QR của đợt.) Trang "Hướng dẫn dự thi" in được (A4) kèm mã QR trang web: cách ghi họ tên/đảng bộ/chi bộ, số lượt, lưu ý mạng yếu, phải chờ màn kết quả, lưu mã phiếu, đầu mối hỗ trợ (nội dung đầu mối do Admin nhập trong cấu hình, không viết cứng).
   - Tài liệu `docs/VAN_HANH.md` (danh sách việc theo mốc thời gian) và README triển khai cập nhật theo các thay đổi trên; xóa/ghi chú lỗi thời `docs/DEPLOY_VPS_DOCKER.md` và `backend/scripts/setup-deploy.js` nếu không còn dùng.
   - Kiểm tra: unit/integration cho rate limit theo user và theo IP, pool, job lặp; `docker compose config` hợp lệ; dựng toàn bộ stack trên máy local bằng compose, migrate, tạo admin, làm một lượt thi end-to-end thủ công; chạy backup rồi restore sang database khác và đối chiếu số dòng; chạy thử tải ở mức có thể trên máy local và ghi rõ đây chưa phải số liệu máy chủ thật.
14. Hoàn thiện UI/UX theo `docs/UI_UX_REVIEW_20261115.md` và rà soát bổ sung (chỉ giao diện, không đổi nghiệp vụ, API, chấm điểm, snapshot; độc lập với giai đoạn 13, có thể làm trước):
   Màn làm bài:
   - Thanh trên cùng (đồng hồ/tên đợt) dùng nền đặc theo token sáng/tối và tắt `backdrop-filter`, chỉ áp dụng cho thanh này; không sửa `.glass-card` dùng chung. Kiểm lại z-index khi cuộn.
   - Điện thoại: thu gọn thanh trên cùng (tên đợt tối đa hai dòng, đồng hồ và Nộp bài nổi bật, ẩn tag phụ), dòng thông báo chỉ chiếm chỗ khi có nội dung; chuyển công tắc "Tự sang câu sau khi chọn" vào ngăn kéo danh sách câu; thanh đáy hiện thêm số câu đã làm (ví dụ "12/30 · đã làm 20").
   - Danh sách câu: một cách biểu thị trạng thái thống nhất ở trang và trong ngăn kéo (ngăn kéo được áp cùng lớp giao diện người thi), có chú giải Đã trả lời / Chưa trả lời / Đang xem; bỏ tiêu đề lặp của card khi nằm trong ngăn kéo.
   - Hộp hỏi rời trang của trình duyệt (`beforeunload`) chỉ bật khi đang nộp bài; F5 không hỏi vì lựa chọn đã giữ trong `sessionStorage`. Giữ hộp xác nhận nội bộ khi chuyển trang trong ứng dụng. Bỏ liên kết "Về danh sách đợt kiểm tra" ở cuối màn làm bài.
   - Hộp xác nhận nộp: khi đã trả lời đủ thì ghi "Bạn đã trả lời đủ N câu" thay vì "còn 0 câu".
   Màn kết quả:
   - Khối kết quả nổi bật trên cùng: Đạt/Không đạt cỡ lớn, số câu đúng/tổng, tỷ lệ, ngưỡng; ngay dưới là mã tra cứu (sao chép) và nút chính "Phiếu kết quả / In phiếu"; "Lịch sử đợt này" và "Về danh sách đợt" là nút thường.
   - Nếu còn lượt và đợt còn mở: hiện "Còn X lượt · Kết quả cao nhất Y%" và nút "Thi lượt tiếp" (đi qua hộp xác nhận bắt đầu như hiện có).
   - Thống kê chi tiết đặt sau, hai cột trên tablet; danh sách câu có bộ lọc Tất cả / Sai / Bỏ trống.
   Cổng vào thi:
   - Điện thoại: thứ tự chọn đợt (nếu có) → form thông tin → hướng dẫn; rút gọn phần giới thiệu, hướng dẫn thu gọn được. Chuyển một cột từ bề rộng tablet hẹp; giữ bố cục desktop hiện tại.
   Quản trị (giảm sai sót khi cấu hình):
   - Trang chi tiết đợt: thứ tự tab Thông tin → Câu hỏi → Cơ cấu đề; khối "Sẵn sàng mở đợt" ở đầu trang liệt kê: có câu hỏi hợp lệ, cơ cấu đủ câu, đã đặt thời gian bắt đầu/kết thúc, trạng thái hiện tại; mỗi mục chưa đạt có liên kết tới đúng tab để sửa.
   - Mở đợt (nút nhanh ở danh sách và ở chi tiết) hiện hộp tóm tắt cấu hình trước khi xác nhận: số câu, thời lượng, số lượt, ngưỡng, giờ chạy thử/bắt đầu/kết thúc (giờ Việt Nam), đảo câu/đáp án, cho xem đáp án, dừng khi đạt.
   - Form tạo/sửa đợt bỏ ô Trạng thái; đổi trạng thái chỉ qua nút Mở đợt / Đóng đợt (Backend giữ nguyên kiểm tra).
   - Bảng câu hỏi thêm cột "Đáp án đúng" để soát nhanh.
   Kiểm tra (bắt buộc trước khi báo xong):
   - Unit test hàm thuần mới (nhãn thanh đáy, điều kiện hiện "Thi lượt tiếp", bộ lọc câu, danh sách mục sẵn sàng); lint, build.
   - Đối chiếu trực quan người thi ở 1440/1024/768/390 cả sáng và tối; màn làm bài thêm: Slow 3G chọn liên tục, tắt/bật mạng, F5, để hết giờ tự chốt; ít nhất một lần trên điện thoại thật mở qua Zalo. Admin: đối chiếu 1440 và 390 cho trang chi tiết đợt và hộp Mở đợt.
   - Cập nhật `docs/UI_UX_REVIEW_20261115.md` (đánh dấu mục đã sửa) và README; báo rõ phần chưa kiểm được.
15. Đơn giản hóa xem kết quả, lưu và in phiếu (chỉ giao diện; không đổi chấm điểm, nội dung phiếu, mã tra cứu, API):
   - Màn kết quả chỉ một nút chính "Lưu / In phiếu". Khối trên cùng: Đạt/Không đạt, tỷ lệ, số câu đúng/tổng, mã phiếu (sao chép) kèm một dòng giải thích ngắn. "Thi lượt tiếp" nằm trong khối riêng, chỉ hiện khi còn lượt. "Lịch sử làm bài" và "Về danh sách đợt" là liên kết nhỏ. "Xem lại câu trả lời" giữ dạng thu gọn.
   - "Lưu / In phiếu" mở cửa sổ (modal, dùng FormModal hiện có) ngay trên màn kết quả, gồm bản xem trước tờ phiếu (ReceiptSheet) và các nút thao tác; không chuyển trang, không tự bật hộp in. Đóng cửa sổ là ở lại màn kết quả.
   - Nút theo thiết bị: máy tính — "In phiếu" (chính) và "Tải PDF"; điện thoại — "Lưu ảnh phiếu" (chính) và "Tải PDF". "Lưu ảnh phiếu" tạo ảnh PNG từ tờ phiếu (dùng lại html-to-image đang dùng cho PDF) và hiển thị ảnh để nhấn giữ lưu về máy, có thêm nút tải ảnh khi trình duyệt hỗ trợ. Khi mở trong trình duyệt của ứng dụng (Zalo, Facebook, Messenger; nhận biết qua user agent): ẩn "In phiếu", hiện dòng "Muốn in hoặc tải PDF, mở bằng Chrome/Safari"; lỗi tải PDF thì gợi ý dùng "Lưu ảnh phiếu".
   - Đường dẫn `/attempts/:id/receipt` giữ để không hỏng liên kết cũ nhưng chuyển hướng (replace) về `/attempts/:id/result` và mở sẵn cửa sổ phiếu; bỏ tham số tự in/tự tải `action=print|download`.
   - Mã phiếu chỉ hiển thị và giải thích ở một chỗ trên màn kết quả; bỏ khung thông báo lặp về mã trong cửa sổ/trang phiếu. Ghi chú trong tờ phiếu giữ nguyên.
   - CSS in: `@page` lề 0, căn lề bên trong tờ phiếu để trình duyệt không in đầu trang/chân trang; bỏ câu dặn "bỏ chọn Đầu trang và chân trang". Bản in vẫn đúng một trang A4 như hiện tại.
   - Trang tra cứu `/receipts`: bấm mã đã lưu là tra cứu ngay; kết quả mở cùng cửa sổ phiếu (cùng nút theo thiết bị). Giữ giới hạn tra cứu và nút xóa mã đã lưu.
   - Trang lịch sử cá nhân: mỗi lượt đã chốt có thêm nút "Phiếu" mở thẳng cửa sổ phiếu (ở danh sách lượt của một đợt).
   - Admin xem phiếu (nếu đang có màn phiếu cho Admin) dùng cùng component cửa sổ phiếu, chỉ có "In phiếu" và "Tải PDF".
   - Kiểm tra: unit test hàm thuần (nhận biết trình duyệt trong ứng dụng, chọn bộ nút theo thiết bị, chuyển hướng đường dẫn phiếu cũ); lint, build. Thủ công: in thử trên Chrome máy tính ra đúng một trang A4 không có đầu/chân trang; "Lưu ảnh phiếu" và "Tải PDF" trên Android Chrome, iPhone Safari và trong Zalo (cả hai hệ điều hành); tra cứu bằng mã khi chưa vào thi; mở phiếu từ lịch sử. Báo rõ thiết bị nào chưa thử được.
16. Đơn giản hóa trang chi tiết đợt của Admin (chỉ giao diện, dùng lại API đợt, cơ cấu đề, thống kê báo cáo; không đổi nghiệp vụ) và sửa test cũ:
   - Đầu trang: liên kết nhỏ "← Danh sách đợt" phía trên; tên đợt, tag trạng thái, thời gian kèm đếm ngược ("còn 4 ngày", "đang thi, kết thúc sau 2 giờ", "đã kết thúc"). Một nút chính theo tình huống: "Mở đợt" (Nháp/Đã đóng) hoặc "Đóng đợt" (Đang mở), vẫn qua hộp xác nhận tóm tắt cấu hình hiện có. "Mã QR", "Báo cáo", "Sửa thông tin" là nút thường; điện thoại gom vào menu "⋯".
   - Đợt Nháp (và Đã đóng chưa có lượt chính thức): thay khối "Sẵn sàng mở đợt" bằng các bước chuẩn bị (Steps): ① Thông tin & thời gian ② Câu hỏi ③ Cơ cấu đề ④ Mở đợt; mỗi bước có trạng thái xong / cần xử lý / chưa làm và mô tả ngắn (ví dụ "300 câu hợp lệ", "2 nghị quyết mới chưa phân bổ", "thiếu giờ kết thúc"); bấm bước 1 mở form Sửa thông tin, bước 2–3 chuyển tab tương ứng. Bỏ mục "trạng thái" khỏi danh sách kiểm tra. Điều kiện bắt buộc trước khi mở: cơ cấu đủ câu, có giờ bắt đầu và kết thúc, giờ kết thúc sau hiện tại. "Mở đợt" khóa khi còn bước bắt buộc chưa xong, tooltip liệt kê phần thiếu; Backend giữ nguyên kiểm tra.
   - Đợt Đang mở / Đã đóng: thay Steps bằng 4 số liệu trực tiếp (đang làm, đã nộp, người tham gia, tỷ lệ đạt — dữ liệu chính thức), tự cập nhật khoảng 30 giây khi đợt đang mở, kèm liên kết "Xem báo cáo". Khi đã có lượt chính thức hiện một dòng khóa: "Đã có người thi: cơ cấu đề bị khóa; sửa câu hỏi chỉ áp dụng cho lượt sau".
   - Tab mặc định: Nháp mở tab của bước chưa xong đầu tiên; Đang mở/Đã đóng mở tab Thông tin. Tab đang chọn giữ trên URL (`?tab=`) để F5 không mất.
   - Tab Thông tin: chia ba nhóm Thời gian (chạy thử, bắt đầu, kết thúc; ghi "giờ Việt Nam" một lần ở tiêu đề nhóm), Cách thi (số câu, thời lượng, số lượt, ngưỡng đạt), Tùy chọn (đảo câu, đảo đáp án, xem đáp án, dừng khi đạt); mô tả đặt trên cùng; nút "Sửa" trong tab.
   - Tab Câu hỏi: bỏ card lồng và tiêu đề lặp; thanh công cụ hai nút chính "Import Excel", "Thêm câu hỏi", menu "⋯" gồm "Tải Excel mẫu", "Xuất Excel"; bỏ dòng "Số câu hợp lệ x / y" (đã có ở Steps/đầu trang). Import xong nếu phát sinh nghị quyết chưa có trong cơ cấu: thông báo kèm nút "Sang Cơ cấu đề".
   - Tab Cơ cấu đề: khi khóa hiện Alert cảnh báo kèm lý do, form chỉ đọc; nghị quyết mới chưa phân bổ đưa lên đầu bảng và tô nổi; dòng "Tổng: N câu mỗi đề", "Xem thử 1 đề mẫu", "Lưu" nằm trong thanh cố định ở đáy vùng nội dung tab (sticky), luôn thấy khi cuộn.
   - Sửa `backend/knexfile.test.js` theo cấu hình pool hiện hành (development mặc định 3, production mặc định 20, tối đa 50) để `pnpm test` backend đạt toàn bộ.
   - Kiểm tra: unit test hàm thuần (trạng thái từng bước, điều kiện khóa "Mở đợt" và danh sách thiếu, nhãn đếm ngược, chọn tab mặc định, phát hiện nghị quyết chưa phân bổ); lint, build; backend `pnpm test` không còn lỗi. Đối chiếu trực quan Admin ở 1440 và 390 cho ba trạng thái Nháp (chưa có câu / thiếu cơ cấu / đủ), Đang mở, Đã đóng; báo phần chưa kiểm được.
17. Gộp phân hệ Quản lý đợt kiểm tra của Admin thành "danh sách + trang tổng quan một trang" (giao diện; chỉ một thay đổi nhỏ ở API kết quả; không đổi nghiệp vụ). Thay cách bố trí của giai đoạn 16, dùng lại component đã có (Steps/số liệu, RoundStructure, RoundQuestions, ReportTables, CommitteeReport, AdminAttemptHistory, RoundQrModal, RoundStatusModal, ReceiptModal):
   Danh sách đợt `/admin/exam-rounds`:
   - Lọc trạng thái bằng nút bấm kèm số lượng (Đang mở / Nháp / Đã đóng), mặc định Đang mở; ô tìm nhận tên đợt hoặc mã phiếu (nhập đúng định dạng mã phiếu thì tra cứu và mở cửa sổ phiếu).
   - Mỗi đợt một dòng hai hàng chữ, bấm cả dòng để chọn: Đang mở/Đã đóng hiện đã nộp, đang làm, tỷ lệ Đạt (chính thức); Nháp hiện phần còn thiếu (ví dụ "thiếu cơ cấu đề", "chưa đặt giờ kết thúc"). Bỏ các nút trên từng dòng, chỉ còn menu "⋯": Mở/Đóng đợt, Mã QR, Xóa (chỉ khi chưa có lượt thi).
   - "Tạo đợt" chỉ hỏi tên đợt, tạo xong chọn ngay đợt mới (cấu hình điền ở khối Cấu hình).
   Bố cục:
   - Từ 1200px: hai cột, danh sách bên trái (hẹp, cuộn riêng), tổng quan đợt đang chọn bên phải; chọn đợt khác không chuyển trang. URL `/admin/exam-rounds/:id` (F5, gửi link mở đúng đợt; không chọn đợt thì cột phải hiện hướng dẫn chọn hoặc tạo đợt).
   - Dưới 1200px: danh sách → bấm dòng sang trang tổng quan, có liên kết "← Đợt kiểm tra".
   Trang tổng quan một trang (không còn tab), các khối xếp dọc:
   - Đầu trang: tên, trạng thái, thời gian bắt đầu → kết thúc kèm đếm ngược; nút "Mã QR" và một nút chính Mở/Đóng đợt (qua hộp xác nhận tóm tắt cấu hình; khóa kèm tooltip khi chưa đủ điều kiện như giai đoạn 16).
   - ① Số liệu: Đang mở/Đã đóng — đang làm, đã nộp, người tham gia, tỷ lệ Đạt (tự cập nhật ~30 giây khi đang mở) và nút "Xuất Excel"; Nháp — danh sách "Cần làm" (câu hỏi, cơ cấu đề, giờ bắt đầu/kết thúc) mỗi mục bấm mở đúng ngăn kéo để sửa.
   - ② Cấu hình: một dòng tóm tắt (số câu · thời lượng · số lượt · ngưỡng · thời gian chạy thử/bắt đầu/kết thúc · các tùy chọn bật) + nút "Sửa".
   - ③ Cơ cấu đề: tóm tắt từng nghị quyết và số câu lấy, tổng / số câu hợp lệ, cảnh báo nghị quyết mới chưa phân bổ, trạng thái khóa; nút "Sửa" và "Xem thử đề".
   - ④ Theo đảng bộ: 10 đảng bộ nhiều người tham gia nhất (tham gia, Đạt, tỷ lệ) + "Xem tất cả". Ẩn ở đợt Nháp chưa có lượt.
   - ⑤ Người dự thi: 10 người vừa nộp gần nhất (họ tên, chi bộ, điểm cao nhất, kết quả, thời gian) + ô tìm nhanh + "Xem tất cả"; bấm một người mở lịch sử lượt và phiếu (AdminAttemptHistory, ReceiptModal). Ẩn ở đợt Nháp chưa có lượt.
   - ⑥ Câu hỏi: tổng số câu hợp lệ, số nghị quyết, 5 câu có tỷ lệ đúng thấp nhất (khi đã có lượt) + nút "Quản lý câu hỏi".
   - Khi đã có lượt chính thức: một dòng khóa "Đã có người thi: cơ cấu đề bị khóa; sửa câu hỏi chỉ áp dụng cho lượt sau".
   Ngăn kéo (Drawer, không chuyển trang; đóng là về đúng vị trí đang xem; rộng trên desktop, toàn màn hình trên điện thoại; giữ trạng thái mở trên URL `?panel=` để F5 không mất):
   - "Sửa cấu hình": form trực tiếp ba nhóm Thời gian (giờ Việt Nam) / Cách thi / Tùy chọn, nút Lưu, hỏi lại khi đóng mà chưa lưu; nút "Xóa đợt" ở cuối khi chưa có lượt thi. Thay hộp "Sửa thông tin" và tab Thông tin.
   - "Cơ cấu đề": RoundStructure như hiện tại.
   - "Kết quả": chuyển cách xem Người dự thi / Theo đảng bộ / Theo câu hỏi; bộ lọc ngay trên bảng (tìm tên/đơn vị, đảng bộ, chi bộ, kết quả, chính thức/chạy thử) thay hộp Bộ lọc; "Xuất Excel" theo bộ lọc đang áp dụng; "Xóa dữ liệu chạy thử" trong menu "⋯" khi đang xem dữ liệu chạy thử. Thay trang `/reports`.
   - "Quản lý câu hỏi": RoundQuestions như giai đoạn 16 (Import, Thêm, Sửa, menu Tải mẫu/Xuất Excel; import có nghị quyết mới thì nút sang "Cơ cấu đề").
   API: danh sách đợt Admin trả thêm số liệu tóm tắt cho từng dòng (đã nộp, đang làm, tỷ lệ Đạt chính thức; với Nháp là danh sách thiếu) và số đợt theo từng trạng thái cho nút lọc, tính theo lô, không truy vấn từng dòng; API kết quả người dự thi nhận thêm `sort=latestAt&order=desc` (cập nhật validator, cURL, test). Không đổi cách tính kết quả, quyền, audit.
   Menu và route:
   - Menu Admin còn: Đợt kiểm tra, Cài đặt chung (đổi tên từ "Hướng dẫn dự thi"; sau đó đã bỏ hẳn theo yêu cầu), Tài khoản. Bỏ "Phiếu kết quả" và "Trang chủ" khỏi menu Admin.
   - Route cũ chuyển hướng (replace), không hỏng liên kết: `/admin/exam-rounds/:id/reports` → `/admin/exam-rounds/:id?panel=results`; `?tab=questions|structure|overview` → panel tương ứng hoặc trang tổng quan; `/admin/receipts` → `/admin/exam-rounds` (giữ ô tra mã); `/admin/receipts/:id` → mở cửa sổ phiếu từ danh sách đợt.
   Kiểm tra: unit test hàm thuần (tóm tắt cấu hình, tóm tắt cơ cấu, danh sách "Cần làm", nhận dạng mã phiếu trong ô tìm, ánh xạ route/tab/panel cũ, bố cục hai cột theo bề rộng); test backend cho số liệu tóm tắt danh sách (đúng số, chỉ tính chính thức, không N+1) và sort latestAt; lint, build, backend `pnpm test` không lỗi. Đối chiếu trực quan Admin ở 1440, 1024 và 390 cho: danh sách + đợt Nháp (chưa có câu / thiếu cơ cấu / đủ), Đang mở có dữ liệu, Đã đóng; mở/đóng từng ngăn kéo, F5 khi đang mở ngăn kéo, liên kết cũ `/reports`. Cập nhật README và báo rõ phần chưa kiểm được.

(Không làm: cụm nhiều máy chủ, Redis, CDN, giám sát chuyên dụng. Sẽ cân nhắc nếu thử tải trên máy chủ thật không đạt ngưỡng.)

## 15. Vận hành chính thức (giả định 1000 người thi đồng thời)

- Cấu hình tham khảo: một máy chủ 4 vCPU, 8 GB RAM, SSD ≥ 80 GB, Docker; VPS hoặc máy chủ nội bộ đều được. Băng thông ≥ 50 Mbps. Chỉ chạy một bản backend.
- Tải ước tính: khoảng 70 request/giây khi làm bài ổn định; đỉnh lúc bắt đầu (1000 lượt start trong vài phút) và lúc kết thúc (1000 lượt nộp/tự chốt trong 1–2 phút).
- Bắt buộc thử tải trên chính máy chủ thật trước ngày thi theo ngưỡng ở giai đoạn 13; không đạt thì tăng cấu hình máy và thử lại.
- Danh sách việc vận hành theo mốc thời gian nằm ở `docs/VAN_HANH.md`.

Ưu tiên MVP hoạt động thực tế, không chỉ giao diện mô phỏng.
