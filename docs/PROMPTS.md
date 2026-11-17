# Prompt triển khai hệ thống kiểm tra nhận thức

Các prompt dưới đây tham chiếu yêu cầu trong `docs/PLAN.md`. Gửi lần lượt từng prompt; chỉ chuyển sang phần tiếp theo sau khi đã xem báo cáo và xác nhận phần trước. Nếu phần nào đã được triển khai, yêu cầu kiểm tra và hoàn thiện phần còn thiếu thay vì làm lại.

Giai đoạn 4 cần có hàm chấm điểm dùng chung để xử lý nộp bài và tự động hết giờ; giai đoạn 6 hoàn thiện API, giao diện kết quả và lịch sử.

Tiến độ: đã làm xong prompt 1–16. Tiếp theo gửi prompt 17 (gộp phân hệ Quản lý đợt kiểm tra của Admin: danh sách + trang tổng quan một trang). Triển khai lên hosting theo docs/DEPLOY_HOSTING.md sau khi xong prompt 17.

## Hướng dẫn chung

Dán đoạn này trước mỗi prompt bên dưới. Các quy tắc chi tiết được giữ tại tài liệu gốc, không sao chép lại ở đây.

```text
Tuân thủ AGENTS.md, UI_REFERENCE.md, AI_RULES.md và README theo phạm vi module.
Đọc các mục liên quan trong docs/PLAN.md, kiểm tra phần đã có trước
khi sửa; chỉ triển khai phần còn thiếu hoặc sai yêu cầu.

Chỉ thực hiện phạm vi được giao bên dưới và dependency trực tiếp.
Không tự làm giai đoạn tiếp theo. Không thay đổi dữ liệu thật.
Giữ thiết kế UI hiện có và thực hiện kiểm tra theo AI_RULES.md.

Sau khi hoàn thành, báo cáo thay đổi, file liên quan, cách chạy thử,
test đã chạy và kết quả pass/fail/skip kèm lý do, phần còn thiếu.
Sau đó dừng chờ tôi xác nhận.
```

## 1. Database, đăng nhập và quản lý tài khoản

```text
Thực hiện giai đoạn 1 tại mục 14 của docs/PLAN.md.

Phạm vi:
- Migration Knex nền cho toàn bộ bảng tại mục 10, đầy đủ index,
  foreign key, unique constraint và down.
- Chuyển password-hash.js sang Argon2id.
- CLI pnpm create-admin theo đúng quy tắc trong plan.
- API /api/admin/users và giao diện quản lý tài khoản:
  tạo, sửa, khóa/mở khóa, xóa mềm.
- Bảo vệ admin cuối cùng; thu hồi phiên và tăng token_version
  theo yêu cầu khi thay đổi tài khoản.
- Giữ cơ chế authentication, CSRF và rate limiting hiện có.

Điều kiện hoàn thành: tạo được admin bằng CLI, đăng nhập được,
ADMIN quản lý được tài khoản; USER không truy cập được chức năng
quản trị. Có test nghiệp vụ/phân quyền và cURL tương ứng.
Chưa triển khai ngân hàng câu hỏi.
```

## 2. Ngân hàng câu hỏi và import Excel

```text
Thực hiện giai đoạn 2 của docs/PLAN.md,
theo mục 3 và các API tương ứng tại mục 11.

Triển khai backend và frontend quản lý ngân hàng câu hỏi:
thêm, sửa, xóa mềm, tìm kiếm, lọc nhóm và allowShuffleOptions.
Tạo API tải Excel mẫu bằng ExcelJS.
Triển khai import preview/commit, lỗi theo dòng; preview không ghi
database, commit trong transaction và chỉ chạy khi người dùng
xác nhận. Xung đột phát sinh sau preview trả 409.

Test thiếu cột, trùng mã, đáp án không hợp lệ, câu có 2–4 lựa chọn,
rollback toàn bộ khi import lỗi và phân quyền.
Dữ liệu câu hỏi thật do tôi tự import bằng file Excel;
không tự tạo hoặc import bộ câu hỏi thật.
Chưa triển khai quản lý đợt kiểm tra.
```

## 3. Quản lý đợt kiểm tra

```text
Thực hiện giai đoạn 3 của docs/PLAN.md theo mục 4 và 11.

Triển khai API và giao diện ADMIN quản lý đợt kiểm tra,
đầy đủ cấu hình và chọn một hoặc nhiều nhóm câu hỏi.
Không cho OPEN khi thiếu câu hỏi hợp lệ.
Triển khai danh sách và chi tiết đợt kiểm tra cho USER.

Validation thời gian, trạng thái, số câu, thời lượng, số lượt và
ngưỡng đạt theo plan. Cập nhật cấu hình không được thay đổi snapshot
của lượt đã tạo. Thời gian lưu UTC, hiển thị Asia/Ho_Chi_Minh.

Có test validation/phân quyền và cURL.
Chưa triển khai tạo lượt thi hoặc giao diện làm bài.
```

## 4. Random đề và quản lý lượt thi

```text
Thực hiện giai đoạn 4 của docs/PLAN.md theo mục 5, 6, 8, 10, 11.

Triển khai API start/resume, lấy lượt thi, lưu đáp án và nộp bài.
Random bằng crypto.randomInt, lưu snapshot đề/cấu hình và ánh xạ
đáp án đúng khi xáo trộn; tôn trọng allowShuffleOptions.

Chống tạo lượt đồng thời bằng transaction, khóa dòng users,
unique constraint và xử lý ER_DUP_ENTRY theo plan.
Bảo đảm giới hạn lượt, stopAfterPass, khung giờ và quyền sở hữu.
Không lộ đáp án đúng khi lượt đang làm.

Triển khai ngay hàm chấm điểm dùng chung theo mục 8 để submit,
job hết giờ và chốt lười sử dụng; mỗi lượt chỉ chấm một lần.
Job có chống chạy chồng, unref và tắt được khi test/migration.

Test race condition, resume không tăng lượt, snapshot, hết giờ,
nộp đồng thời, IDOR và không sửa bài đã kết thúc.
Chưa làm giao diện làm bài hoặc trang kết quả.
```

## 5. Giao diện làm bài

```text
Thực hiện giai đoạn 5 của docs/PLAN.md theo mục 7,
tích hợp API thật từ giai đoạn 4.

Xây dựng luồng chọn đợt, bắt đầu/tiếp tục lượt và làm bài:
đồng hồ, chọn đáp án, câu trước/sau, danh sách câu đã/chưa trả lời,
tự lưu và xác nhận nộp bài.

F5 hoặc đăng nhập lại phải khôi phục lượt và đáp án đã lưu.
Đồng bộ thời gian từ server; xử lý mất mạng, lưu lỗi, hết giờ
và thao tác nộp khi còn đáp án đang chờ lưu.
Không lưu đề hoặc đáp án vào localStorage.

Giữ pattern UI hiện có; kiểm tra desktop/tablet/mobile theo
AI_RULES.md. Chưa làm dashboard hoặc xuất Excel.
```

## 6. Kết quả và lịch sử thi

```text
Thực hiện giai đoạn 6 của docs/PLAN.md theo mục 8, 9 và 11.

Rà soát, hoàn thiện hàm chấm điểm đã có ở giai đoạn 4,
không tạo thêm cơ chế chấm độc lập.
Dùng phép so sánh số nguyên để xét Đạt; test 14/20 Đạt,
13/20 Không đạt với ngưỡng 70%.

Triển khai API và giao diện kết quả từng lượt, lịch sử cá nhân,
GET /api/attempts/:id/result và GET /api/my-results.
Hiển thị đáp án đúng chỉ khi lượt kết thúc và snapshot
showCorrectAnswers=true.

Tính kết quả cuối PASSED, FAILED, IN_PROGRESS_ROUND, NOT_STARTED
theo plan; giữ nguyên lịch sử.
Test quyền sở hữu, ẩn đáp án và tính bất biến của snapshot.
Chưa làm báo cáo quản trị.
```

## 7. Dashboard và xuất Excel

```text
Thực hiện giai đoạn 7 của docs/PLAN.md theo mục 12 và 11.

Triển khai API và giao diện ADMIN xem kết quả, thống kê theo đợt,
lọc bảng chi tiết và xuất Excel bằng ExcelJS.
Đầy đủ các chỉ số và cột dữ liệu được quy định trong plan.

Phân biệt số người tham gia với tổng số lượt.
Thống kê, bảng chi tiết và file xuất phải nhất quán về cách tính
kết quả cuối và bộ lọc. Audit log thao tác xuất báo cáo.

Test dữ liệu một người nhiều lượt, người có ít nhất một lượt PASS,
đợt đã đóng, phân quyền và nội dung file Excel.
Chưa làm Docker hoặc triển khai VPS.
```

## 8. Chuyển câu hỏi sang mô hình theo đợt

```text
Thực hiện giai đoạn 8 của docs/PLAN.md theo mục 3, 4, 10, 11
và mô tả giai đoạn 8 tại mục 14.

Giai đoạn 2–7 đang dùng ngân hàng câu hỏi dùng chung + chọn nhóm
cho đợt. Chuyển sang: câu hỏi thuộc riêng từng đợt, luồng tạo đợt
Nháp → thêm/import câu hỏi trong đợt → mở đợt.
Không thay đổi nghiệp vụ lượt thi, chấm điểm, kết quả, báo cáo.

Database (chưa dùng thật, sửa thẳng migration rồi dựng lại):
- questions thêm exam_round_id (FK), category_name;
  unique (exam_round_id, question_code); bỏ question_categories,
  exam_round_categories và FK liên quan; down đầy đủ.

Backend:
- Route câu hỏi về /api/admin/exam-rounds/:id/questions
  (CRUD, import preview/commit, xuất Excel cùng định dạng mẫu);
  giữ GET /api/admin/questions/template.
- Validator đợt bỏ categoryIds; tạo được đợt Nháp chưa có câu.
- Mở đợt đếm câu hợp lệ của chính đợt; không cho vô hiệu hóa/xóa
  câu làm đợt OPEN thiếu câu.
- Câu chưa từng vào đề thì xóa hẳn; câu đã dùng chỉ vô hiệu hóa.
- Xóa đợt (chưa có lượt) xóa kèm câu hỏi trong cùng transaction.
- Sinh đề lấy câu theo exam_round_id; snapshot nhóm lấy từ
  category_name; báo cáo, thống kê từng câu và Excel đổi nguồn
  tên nhóm, kết quả không đổi. Giữ audit log cho mọi thao tác.

Frontend:
- Bỏ trang/menu Ngân hàng câu hỏi; form đợt bỏ ô chọn nhóm.
- Thêm tab "Câu hỏi" trong trang chi tiết đợt (ADMIN), dùng lại
  QuestionFormModal, QuestionImportModal; tìm kiếm, lọc nhóm,
  hiện số câu hợp lệ / số câu mỗi bài, nút xuất Excel.

Cập nhật cURL, README, unit/integration test. Thêm test: câu đợt A
không vào đề đợt B; cùng mã dùng được ở hai đợt; trùng mã trong
một đợt bị chặn; xóa đợt kéo theo câu hỏi; chặn vô hiệu hóa làm
đợt OPEN thiếu câu; xuất rồi import sang đợt khác giữ nguyên dữ
liệu; lượt thi cũ giữ nguyên snapshot sau khi sửa câu.
Chưa làm giai đoạn 9.
```

## 9. Rà soát và hoàn thiện chạy local

```text
Thực hiện giai đoạn 9 của docs/PLAN.md.

Đối chiếu các chức năng đã triển khai với mục 13 và toàn bộ
điều kiện nghiệp vụ trong plan. Sửa thiếu sót trong phạm vi MVP,
bổ sung test hồi quy và cURL bị thiếu.

Kiểm tra riêng các yêu cầu bổ sung sau khi giai đoạn 4–7 đã làm,
thiếu thì bổ sung:
- Màn làm bài (mục 7): gom câu theo nhóm, nhắc giờ 10/5 phút,
  báo mất mạng và gửi lại đáp án chưa lưu, nộp tự thử lại + nút
  "Nộp lại", phím tắt ←/→ và A/B/C/D.
- Chạy thử (mục 4): trial_start_at, is_trial, đánh số lượt riêng,
  tách khỏi báo cáo, xóa dữ liệu chạy thử có audit log.
- Thống kê từng câu (mục 12): tỷ lệ đúng, số chọn A/B/C/D/bỏ trống
  theo phương án gốc khi đã đảo, sheet Excel "Theo câu hỏi".
- Kịch bản thử tải pnpm load-test (mục 12): chỉ chạy khi đợt đang
  chạy thử, báo thời gian phản hồi, lỗi, kiểm tra không vượt lượt
  và không có hai lượt IN_PROGRESS.

Rà soát authentication, CSRF, phân quyền, IDOR, rò rỉ đáp án,
race condition, giới hạn lượt, hết giờ và snapshot lịch sử.
Chạy kiểm tra theo AI_RULES.md trên database test riêng.

Hoàn thiện .env.example và README hướng dẫn tạo database MySQL,
cấu hình DB_*, migrate, tạo admin và chạy local.
Đối chiếu UI theo checklist, báo rõ phần chưa kiểm tra.

Kết thúc bằng bảng yêu cầu đã đạt/chưa đạt và các điểm còn chặn
MVP. Không làm Docker, VPS hoặc backup/restore.
```

## 10. Cải thiện trải nghiệm sử dụng

```text
Thực hiện giai đoạn 10 tại mục 14 của docs/PLAN.md.
Không thay đổi nghiệp vụ thi, chấm điểm, giới hạn lượt và snapshot.
Không cần migration mới trừ khi thật sự cần; nếu cần, báo lý do.

Người dự thi:
- Hộp xác nhận trước khi bắt đầu lượt: tên đợt, số câu, thời lượng,
  lượt thứ mấy / tối đa, họ tên – đảng bộ – chi bộ. Chỉ gọi start
  sau khi bấm "Bắt đầu làm bài". Có lượt đang làm thì nút là
  "Tiếp tục làm bài", vào thẳng bài.
- API danh sách/chi tiết đợt trả thêm trạng thái tham gia của chính
  người đó: lượt chính thức đã dùng/tối đa, còn lại, lượt đang làm,
  kết quả cuối, lý do không thể bắt đầu (chưa đến giờ, đã kết thúc,
  hết lượt, đã đạt khi stopAfterPass). Thẻ đợt hiện các thông tin
  này; nút bắt đầu khóa kèm lý do. Tiêu đề trang "Đợt kiểm tra";
  đợt đang thi/chạy thử xếp trước, đợt đã kết thúc xếp sau.
- Bỏ nút Mã QR khỏi giao diện người thi.

Quản trị:
- Admin đăng nhập xong vào thẳng /admin/exam-rounds.
- Nút "Mã QR" (in/tải ảnh, dẫn tới cổng vào thi) trên danh sách và
  chi tiết đợt của Admin; dùng lại RoundQrModal.
- Danh sách đợt: cột "Câu hợp lệ / số câu mỗi bài" (đánh dấu khi
  thiếu); nút nhanh "Mở đợt" / "Đóng đợt" có xác nhận, dùng đúng
  kiểm tra đủ câu ở Backend, báo lý do khi bị từ chối, audit log.
- Báo cáo đợt thêm tab "Theo đảng bộ": mỗi đảng bộ một dòng (tham
  gia, Đạt, Không đạt, chưa hoàn thành, tỷ lệ Đạt, tổng lượt), gộp
  theo giá trị đã chuẩn hóa NFC/khoảng trắng/hoa-thường; bấm dòng để
  lọc bảng người dự thi. Dùng chung bộ lọc chính thức/chạy thử;
  Excel thêm sheet "Theo đảng bộ".
- Xem lịch sử từng lượt của một người: từ bảng người dự thi mở danh
  sách mọi lượt và chi tiết một lượt (câu hỏi, đáp án đã chọn, đáp án
  đúng theo snapshot), chỉ xem. API chỉ ADMIN:
  GET /api/admin/exam-rounds/:id/participants/:userId/attempts,
  GET /api/admin/attempts/:id; audit log khi xem chi tiết.

Test: trạng thái tham gia và lý do khóa nút; USER gọi API xem lượt
của Admin bị 403; tổng hợp theo đảng bộ khớp bảng chi tiết và Excel;
Mở đợt thiếu câu bị từ chối; unit test hàm thuần frontend (nhãn nút,
lý do khóa, sắp xếp đợt). Cập nhật cURL, README.
Đối chiếu desktop/tablet/mobile theo AI_RULES.md, báo phần chưa
kiểm tra được.
```

## 11. Đơn giản hóa cơ cấu đề

```text
Thực hiện giai đoạn 11 tại mục 14 của docs/PLAN.md, theo mục 6
"Cơ cấu đề". Thay hoàn toàn chia đề 3 chế độ + bộ đề tạo trước.
Không thay đổi chấm điểm, giới hạn lượt, chạy thử, snapshot lịch sử.

Bỏ:
- Phát đề "Tạo trước bộ đề" (PREGENERATED), chế độ EQUAL/CUSTOM,
  API/UI/test tạo-xóa-xem bộ đề, papers_locked_at.
- Database chưa dùng thật: sửa migration 202611130001_round_papers.js
  chỉ còn exam_rounds.selection_config, bỏ bảng exam_papers; down
  đầy đủ; dựng lại database dev/test.

Backend:
- selection_config: { mode: 'RANDOM' | 'BY_GROUP',
  groups: [{ category, count, order }] }. Chuẩn hóa tên nhóm;
  question_count do Backend tính (RANDOM = số Admin nhập,
  BY_GROUP = tổng count); bỏ questionCount khỏi API tạo/sửa đợt.
- API: GET cơ cấu kèm danh sách nhóm + số câu hợp lệ từng nhóm;
  PUT lưu cơ cấu (lỗi theo từng nhóm); POST xem thử 1 đề mẫu
  (ADMIN, không ghi database, không tạo lượt, audit log).
- Kiểm tra đủ câu khi lưu, khi Mở đợt; chặn vô hiệu hóa/xóa câu làm
  thiếu cơ cấu khi OPEN. Nhóm mới sau khi lưu mặc định 0 câu.
- Khóa cơ cấu khi đợt có lượt chính thức (lượt thử không khóa).
- Sinh đề mỗi lượt bằng crypto.randomInt theo cơ cấu. BY_GROUP giữ
  thứ tự nghị quyết theo order, shuffle_questions chỉ đảo trong
  nhóm; RANDOM đảo toàn bộ. Lưu cơ cấu trong config_snapshot.

Frontend (ADMIN, tab "Cơ cấu đề" thay tab "Chia đề"):
- Radio: "Lấy ngẫu nhiên toàn bộ" (một ô Số câu mỗi đề) /
  "Lấy theo từng nghị quyết" (bảng tự liệt kê nhóm: tên, câu hiện có,
  Lấy mỗi đề; nhóm mới làm nổi).
- Ô "Mỗi nghị quyết lấy [k] câu" + "Áp dụng cho tất cả"; lỗi đỏ
  theo dòng; dòng tổng "Tổng: N câu mỗi đề"; nút lên/xuống thứ tự
  (mặc định sắp xếp tự nhiên theo tên).
- Nút "Xem thử 1 đề mẫu" (modal, có đáp án đúng) và "Lưu".
- Khi khóa: một câu "Đợt đã có người thi, không thay đổi được
  cơ cấu đề", form chỉ đọc.
- Form Sửa đợt bỏ ô số câu; danh sách đợt cột câu hợp lệ / số câu
  mỗi bài tính theo cơ cấu. Dùng lại component/pattern hiện có.

Test: 10 nhóm × 10 câu lấy 3 → 30 câu, đúng 3 câu/nhóm, không trùng;
RANDOM 300 câu lấy 50; vượt số câu nhóm bị từ chối; nhóm 0 không
xuất hiện; thứ tự nhóm giữ đúng khi đảo câu; khóa sau lượt chính
thức, không khóa bởi lượt thử; xem thử không ghi database, USER 403;
chặn vô hiệu hóa câu làm thiếu cơ cấu khi OPEN; lượt cũ giữ snapshot.
Unit test hàm thuần frontend (áp dụng k, tổng, lỗi dòng, sắp xếp
tự nhiên). Cập nhật cURL, README; ghi chú PAPERS_REVIEW.md là đã
thay thế. Đối chiếu desktop/tablet/mobile theo AI_RULES.md.
```

## 12. Làm bài mượt khi mạng chậm và rút gọn thao tác

```text
Thực hiện giai đoạn 12 tại mục 14 của docs/PLAN.md, theo mục 7 và 11.
Không thay đổi chấm điểm, giới hạn lượt, chạy thử, snapshot lịch sử.

Lưu đáp án ("giữ trên máy, gửi ngầm theo lô, nộp gửi toàn bộ"):
- Chọn đáp án cập nhật ngay, không chờ mạng, không hiện trạng thái
  lưu sau từng lần bấm. Bỏ cơ chế gửi mỗi 0,5 giây.
- Lưu tạm trong sessionStorage theo mã lượt: chỉ
  {attemptQuestionId: A/B/C/D|null}, thời điểm sửa, hạn chót.
  Không lưu nội dung câu hỏi hay đáp án đúng; không dùng localStorage.
  Xóa khi nộp xong, khi lượt đã chốt, khi đăng xuất, khi quá hạn.
- Mở lại trang: lấy lựa chọn từ Backend, áp lựa chọn mới hơn trong
  sessionStorage, câu khác Backend vào hàng chờ gửi.
- Gửi ngầm theo lô khoảng 30 giây, chỉ câu đã đổi, và khi trang bị
  ẩn (visibilitychange/pagehide, fetch keepalive). Lô lỗi để lô sau
  gửi bù, không hiện lỗi giữa màn.
- Timeout riêng màn làm bài: lưu ~30 giây, nộp ~60 giây.

Backend:
- POST /api/attempts/:id/submit nhận kèm answers (toàn bộ đáp án),
  validate thuộc lượt và phương án hợp lệ (422), ghi + chấm trong một
  transaction, chặn quá hạn (cộng sai lệch cho phép), gọi lại
  idempotent. Giữ API lưu theo lô hiện có. Cập nhật cURL.

Nộp bài và kết quả:
- Màn chờ "Đang nộp bài…" có tự thử lại; nộp hoặc tự chốt xong
  navigate thẳng /attempts/:id/result (replace). Bỏ thẻ
  "Đã ghi nhận bài nộp" trung gian. Màn kết quả hiện "Đã nộp bài lúc …"
  hoặc "Hết giờ, hệ thống đã tự chốt bài" và cảnh báo nếu có lựa chọn
  chưa kịp ghi nhận.
- Hộp xác nhận nộp liệt kê số thứ tự câu chưa trả lời, bấm để quay lại.

Màn làm bài:
- Trạng thái lưu/mạng là biểu tượng nhỏ cạnh đồng hồ ("Đã lưu" /
  "Chưa đồng bộ – sẽ gửi khi nộp"); mọi thông báo ở vị trí cố định,
  không đẩy nội dung câu hỏi.
- Đồng hồ chỉ chỉnh khi lệch server quá 2 giây; từ mốc 5 phút giữ dòng
  nhắc cố định cạnh đồng hồ.
- Điện thoại: thanh điều hướng cố định ở đáy
  (‹ Câu trước · "12/30" · Câu sau ›), danh sách câu mở dạng ngăn kéo.
- "Câu sau" là nút chính bên phải, "Bỏ chọn" là liên kết nhỏ.
- Công tắc "Tự sang câu sau khi chọn" (mặc định bật trên điện thoại,
  nhớ theo trình duyệt). Nhớ vị trí câu khi F5 (sessionStorage).

Test: submit kèm đáp án ghi đúng, chấm đúng một lần; submit lại không
đổi kết quả; submit sau hạn bị từ chối và bài chấm theo đáp án đã gửi
trước đó; đáp án không thuộc lượt bị 422; hợp nhất sessionStorage với
Backend; xóa sessionStorage đúng thời điểm; nhịp gửi theo lô; điều
hướng sang kết quả; tự sang câu; đồng hồ không nhảy khi lệch nhỏ.
Thử thủ công DevTools "Slow 3G": chọn liên tục không trễ, nộp không
báo lỗi giả. Đối chiếu desktop/tablet/mobile theo AI_RULES.md, báo
phần chưa kiểm tra được.
```

## 13. Triển khai và vận hành cho 1000 người thi đồng thời

```text
Thực hiện giai đoạn 13 tại mục 14 và mục 15 của docs/PLAN.md.
Giả định 1000 người thi cùng lúc, chạy bằng Docker Compose trên VPS
hoặc máy chủ nội bộ. Không đổi nghiệp vụ thi, chấm điểm, snapshot.
Không chạy gì trên database thật; không đưa secret vào source.

Backend:
- Rate limit: API của người đã vào thi (làm bài, đợt, kết quả, phiếu)
  giới hạn theo user id (mặc định 600/15 phút/người); toàn API theo IP
  nâng lên, mặc định 30000/15 phút; vào thi theo IP 3000/15 phút; giữ
  chặt đăng nhập Admin và tra cứu phiếu công khai. Tất cả qua biến môi
  trường, cập nhật .env.example. Log IP thật (TRUST_PROXY), log 429.
- knexfile.js: bỏ giới hạn cứng pool tối đa 4; cho phép đến 50,
  production mặc định 20, dev giữ nhỏ.
- Job tự chốt: mỗi lượt chạy lặp lô 100 đến khi hết lượt quá hạn
  (giới hạn thời gian mỗi lượt, chống chạy chồng).

Docker và vận hành:
- Viết lại compose.yaml, Dockerfile, deploy/Caddyfile theo source hiện
  tại, bỏ cấu hình hệ thống cũ (ticket, bootstrap token, tên hts):
  db (MySQL 8, volume, healthcheck, utf8mb4) → migrate → backend
  (một bản, restart, healthcheck /api/health) → web (Caddy, frontend
  build, proxy /api, HTTPS khi có tên miền).
  .env.production.example đủ biến, có giải thích, không secret thật.
- deploy/backup.sh (mysqldump nén, giữ N bản, cron hằng ngày) và
  deploy/restore.sh (hỏi xác nhận, từ chối ghi đè DB có dữ liệu nếu
  không có cờ rõ ràng).
- pnpm load-test: 1000 người ảo tăng dần 5 phút, nhịp gửi ngầm thật,
  1000 lượt nộp dồn 2 phút cuối, nhóm 100 người chung một IP; báo
  p50/p95/p99, lỗi theo mã (429, 5xx), vượt lượt / IN_PROGRESS kép
  phải bằng 0. Ngưỡng: lỗi < 0,5%, p95 lưu < 1s, p95 nộp < 3s.
- Trang "Hướng dẫn dự thi" in A4 kèm QR trang web; đầu mối hỗ trợ do
  Admin nhập, không viết cứng.
- Cập nhật README triển khai và docs/VAN_HANH.md; xóa hoặc ghi chú
  lỗi thời docs/DEPLOY_VPS_DOCKER.md, backend/scripts/setup-deploy.js.

Kiểm tra: test rate limit theo user/IP, pool, job lặp;
docker compose config; dựng toàn stack local bằng compose, migrate,
tạo admin, làm một lượt thi end-to-end; backup rồi restore sang DB
khác và đối chiếu số dòng; thử tải ở mức máy local cho phép và ghi rõ
chưa phải số liệu máy chủ thật. Báo phần chưa kiểm tra được.
```

## 14. Hoàn thiện UI/UX

```text
Thực hiện giai đoạn 14 tại mục 14 của docs/PLAN.md, dựa trên
docs/UI_UX_REVIEW_20261115.md. Chỉ sửa giao diện; không đổi nghiệp
vụ, API, chấm điểm, snapshot. Dùng lại token, class, component hiện có.

Màn làm bài:
- Thanh trên cùng: nền đặc theo token sáng/tối, tắt backdrop-filter,
  chỉ cho thanh này; không sửa .glass-card dùng chung; kiểm z-index.
- Điện thoại: tên đợt tối đa hai dòng, đồng hồ + Nộp bài nổi bật, ẩn
  tag phụ; dòng thông báo chỉ chiếm chỗ khi có nội dung; công tắc
  "Tự sang câu sau khi chọn" chuyển vào ngăn kéo; thanh đáy hiện
  "12/30 · đã làm 20".
- Danh sách câu: cùng màu trạng thái ở trang và ngăn kéo (áp lớp giao
  diện người thi cho ngăn kéo), chú giải Đã trả lời/Chưa/Đang xem;
  bỏ tiêu đề card lặp trong ngăn kéo.
- beforeunload chỉ khi đang nộp bài (F5 không hỏi); giữ hộp xác nhận
  khi chuyển trang trong ứng dụng; bỏ liên kết "Về danh sách đợt" cuối
  màn làm bài.
- Hộp xác nhận nộp: đủ câu thì ghi "Bạn đã trả lời đủ N câu".

Màn kết quả:
- Khối trên cùng: Đạt/Không đạt cỡ lớn, đúng/tổng, tỷ lệ, ngưỡng; mã
  tra cứu (sao chép) + nút chính "Phiếu kết quả / In phiếu"; "Lịch sử
  đợt này", "Về danh sách đợt" là nút thường.
- Còn lượt và đợt còn mở: "Còn X lượt · Kết quả cao nhất Y%" + nút
  "Thi lượt tiếp" qua hộp xác nhận bắt đầu hiện có.
- Thống kê chi tiết đặt sau, hai cột trên tablet; danh sách câu lọc
  Tất cả / Sai / Bỏ trống.

Cổng vào thi (điện thoại): chọn đợt → form → hướng dẫn thu gọn được;
rút gọn giới thiệu; một cột từ tablet hẹp; giữ desktop.

Quản trị:
- Chi tiết đợt: tab Thông tin → Câu hỏi → Cơ cấu đề; khối "Sẵn sàng
  mở đợt" (câu hỏi hợp lệ, cơ cấu đủ câu, thời gian bắt đầu/kết thúc,
  trạng thái) với liên kết tới tab cần sửa.
- Mở đợt (danh sách và chi tiết): hộp tóm tắt cấu hình trước khi xác
  nhận (số câu, thời lượng, số lượt, ngưỡng, giờ chạy thử/bắt đầu/kết
  thúc giờ Việt Nam, đảo câu/đáp án, xem đáp án, dừng khi đạt).
- Form đợt bỏ ô Trạng thái; đổi trạng thái chỉ qua Mở/Đóng đợt.
- Bảng câu hỏi thêm cột "Đáp án đúng".

Kiểm tra bắt buộc: unit test hàm thuần mới, lint, build; đối chiếu
trực quan người thi 1440/1024/768/390 sáng và tối; màn làm bài với
Slow 3G, tắt/bật mạng, F5, hết giờ tự chốt; ít nhất một lần trên điện
thoại thật qua Zalo; Admin 1440 và 390 cho chi tiết đợt và hộp Mở
đợt. Đánh dấu mục đã sửa trong UI_UX_REVIEW_20261115.md, cập nhật
README, báo rõ phần chưa kiểm được.
```

## 15. Đơn giản hóa xem kết quả, lưu và in phiếu

```text
Thực hiện giai đoạn 15 tại mục 14 của docs/PLAN.md. Chỉ sửa giao diện;
không đổi chấm điểm, nội dung phiếu, mã tra cứu, API. Dùng lại
FormModal, ReceiptSheet, receiptDownload và token/class hiện có.

Màn kết quả:
- Một nút chính "Lưu / In phiếu". Khối trên cùng: Đạt/Không đạt, tỷ lệ,
  đúng/tổng, mã phiếu (sao chép) + một dòng giải thích ngắn.
- "Thi lượt tiếp" trong khối riêng, chỉ khi còn lượt. "Lịch sử làm bài",
  "Về danh sách đợt" là liên kết nhỏ. "Xem lại câu trả lời" thu gọn.

Cửa sổ phiếu (modal trên màn kết quả, không chuyển trang, không tự in):
- Xem trước tờ phiếu + nút theo thiết bị:
  máy tính: "In phiếu" (chính), "Tải PDF";
  điện thoại: "Lưu ảnh phiếu" (chính), "Tải PDF".
- "Lưu ảnh phiếu": tạo PNG từ tờ phiếu (html-to-image), hiển thị ảnh để
  nhấn giữ lưu; thêm nút tải ảnh khi trình duyệt hỗ trợ.
- Trong Zalo/Facebook/Messenger (nhận biết qua user agent): ẩn "In
  phiếu", hiện "Muốn in hoặc tải PDF, mở bằng Chrome/Safari"; tải PDF
  lỗi thì gợi ý "Lưu ảnh phiếu".
- Đóng cửa sổ: ở lại màn kết quả.

Khác:
- /attempts/:id/receipt chuyển hướng (replace) về /attempts/:id/result
  và mở sẵn cửa sổ phiếu; bỏ tham số action=print|download.
- Mã phiếu chỉ giải thích ở một chỗ; bỏ khung thông báo lặp về mã.
- CSS in: @page lề 0, căn lề trong tờ phiếu, không in đầu/chân trang;
  bỏ câu dặn "bỏ chọn Đầu trang và chân trang"; vẫn đúng một trang A4.
- /receipts: bấm mã đã lưu là tra cứu ngay; kết quả mở cùng cửa sổ phiếu.
- Lịch sử cá nhân (danh sách lượt của một đợt): lượt đã chốt có nút
  "Phiếu" mở thẳng cửa sổ phiếu.
- Màn phiếu của Admin (nếu có) dùng cùng component, chỉ In và Tải PDF.

Kiểm tra: unit test hàm thuần (nhận biết trình duyệt trong ứng dụng,
chọn bộ nút theo thiết bị, chuyển hướng đường dẫn phiếu cũ); lint,
build. Thủ công: in Chrome máy tính đúng một trang A4 không đầu/chân
trang; "Lưu ảnh phiếu" và "Tải PDF" trên Android Chrome, iPhone Safari,
trong Zalo; tra cứu bằng mã khi chưa vào thi; mở phiếu từ lịch sử.
Cập nhật README; báo rõ thiết bị nào chưa thử được.
```

## 16. Đơn giản hóa trang chi tiết đợt của Admin

```text
Thực hiện giai đoạn 16 tại mục 14 của docs/PLAN.md. Chỉ sửa giao diện,
dùng lại API đợt, cơ cấu đề, thống kê báo cáo; không đổi nghiệp vụ.
Dùng lại component/token hiện có (Steps, Statistic, Dropdown của Ant
Design theo pattern sẵn có).

Đầu trang:
- Liên kết nhỏ "← Danh sách đợt"; tên đợt, tag trạng thái, thời gian
  kèm đếm ngược ("còn 4 ngày", "đang thi, kết thúc sau 2 giờ",
  "đã kết thúc").
- Một nút chính: "Mở đợt" (Nháp/Đã đóng) hoặc "Đóng đợt" (Đang mở),
  qua hộp xác nhận tóm tắt cấu hình hiện có. "Mã QR", "Báo cáo",
  "Sửa thông tin" là nút thường; điện thoại gom vào menu "⋯".

Đợt Nháp (và Đã đóng chưa có lượt chính thức):
- Steps thay khối "Sẵn sàng mở đợt": ① Thông tin & thời gian
  ② Câu hỏi ③ Cơ cấu đề ④ Mở đợt; trạng thái xong / cần xử lý /
  chưa làm + mô tả ngắn ("300 câu hợp lệ", "2 nghị quyết mới chưa
  phân bổ", "thiếu giờ kết thúc"). Bước 1 mở form Sửa thông tin,
  bước 2–3 chuyển tab. Bỏ mục "trạng thái" khỏi danh sách kiểm tra.
- Bắt buộc trước khi mở: cơ cấu đủ câu, có giờ bắt đầu và kết thúc,
  giờ kết thúc sau hiện tại. "Mở đợt" khóa khi thiếu, tooltip liệt kê
  phần thiếu; Backend giữ nguyên kiểm tra.

Đợt Đang mở / Đã đóng:
- 4 số liệu chính thức: đang làm, đã nộp, người tham gia, tỷ lệ đạt;
  tự cập nhật ~30 giây khi đang mở; liên kết "Xem báo cáo".
- Có lượt chính thức: dòng khóa "Đã có người thi: cơ cấu đề bị khóa;
  sửa câu hỏi chỉ áp dụng cho lượt sau".

Tab:
- Mặc định: Nháp mở tab của bước chưa xong đầu tiên; Đang mở/Đã đóng
  mở Thông tin. Giữ tab trên URL (?tab=).
- Thông tin: mô tả trên cùng; ba nhóm Thời gian (ghi "giờ Việt Nam" một
  lần), Cách thi, Tùy chọn; nút "Sửa" trong tab.
- Câu hỏi: bỏ card lồng và tiêu đề lặp; hai nút chính "Import Excel",
  "Thêm câu hỏi"; menu "⋯" gồm "Tải Excel mẫu", "Xuất Excel"; bỏ dòng
  "Số câu hợp lệ x / y". Import xong có nghị quyết chưa có trong cơ cấu
  thì thông báo kèm nút "Sang Cơ cấu đề".
- Cơ cấu đề: khóa thì Alert cảnh báo kèm lý do, form chỉ đọc; nghị
  quyết mới chưa phân bổ lên đầu bảng, tô nổi; "Tổng: N câu mỗi đề",
  "Xem thử 1 đề mẫu", "Lưu" trong thanh sticky ở đáy vùng tab.

Backend: sửa backend/knexfile.test.js theo pool hiện hành (development
mặc định 3, production mặc định 20, tối đa 50).

Kiểm tra: unit test hàm thuần (trạng thái bước, điều kiện khóa Mở đợt
và danh sách thiếu, nhãn đếm ngược, tab mặc định, nghị quyết chưa phân
bổ); lint, build; backend pnpm test không còn lỗi. Đối chiếu trực quan
Admin 1440 và 390 cho Nháp (chưa có câu / thiếu cơ cấu / đủ), Đang mở,
Đã đóng. Cập nhật README; báo rõ phần chưa kiểm được.
```

## 17. Gộp phân hệ Quản lý đợt kiểm tra (danh sách + trang tổng quan)

```text
Thực hiện giai đoạn 17 tại mục 14 của docs/PLAN.md. Thay cách bố trí
của giai đoạn 16 cho cả phân hệ Admin "Đợt kiểm tra". Không đổi nghiệp
vụ, cách tính kết quả, quyền, audit. Dùng lại component đã có
(RoundStructure, RoundQuestions, ReportTables, CommitteeReport,
AdminAttemptHistory, RoundQrModal, RoundStatusModal, ReceiptModal) và
token/class hiện có.

Danh sách /admin/exam-rounds:
- Nút lọc kèm số lượng: Đang mở (mặc định) / Nháp / Đã đóng. Ô tìm nhận
  tên đợt hoặc mã phiếu (đúng định dạng mã thì tra và mở cửa sổ phiếu).
- Mỗi đợt một dòng hai hàng, bấm cả dòng để chọn. Đang mở/Đã đóng: đã
  nộp, đang làm, tỷ lệ Đạt. Nháp: phần còn thiếu. Bỏ nút trên từng dòng,
  chỉ menu "⋯": Mở/Đóng đợt, Mã QR, Xóa (khi chưa có lượt).
- "Tạo đợt" chỉ hỏi tên, tạo xong chọn ngay đợt mới.

Bố cục: từ 1200px hai cột (danh sách trái cuộn riêng, tổng quan phải),
chọn đợt không chuyển trang, URL /admin/exam-rounds/:id; dưới 1200px
danh sách → trang tổng quan có "← Đợt kiểm tra".

Trang tổng quan một trang (bỏ tab), khối xếp dọc:
- Đầu trang: tên, trạng thái, bắt đầu → kết thúc + đếm ngược; "Mã QR"
  và một nút chính Mở/Đóng đợt (hộp xác nhận; khóa + tooltip khi thiếu).
- ① Số liệu: đang làm, đã nộp, người tham gia, tỷ lệ Đạt (~30 giây khi
  đang mở) + "Xuất Excel". Nháp: danh sách "Cần làm", bấm mở đúng ngăn kéo.
- ② Cấu hình: một dòng tóm tắt + "Sửa".
- ③ Cơ cấu đề: tóm tắt từng nghị quyết, tổng / câu hợp lệ, cảnh báo
  nghị quyết mới, trạng thái khóa; "Sửa", "Xem thử đề".
- ④ Theo đảng bộ: 10 đơn vị nhiều người nhất + "Xem tất cả".
- ⑤ Người dự thi: 10 người vừa nộp gần nhất + tìm nhanh + "Xem tất cả";
  bấm một người mở lịch sử lượt và phiếu.
- ⑥ Câu hỏi: số câu hợp lệ, số nghị quyết, 5 câu đúng thấp nhất +
  "Quản lý câu hỏi".
- ④⑤ ẩn ở đợt Nháp chưa có lượt. Có lượt chính thức: dòng khóa
  "Đã có người thi: cơ cấu đề bị khóa; sửa câu hỏi chỉ áp dụng cho lượt sau".

Ngăn kéo (Drawer; không chuyển trang; rộng trên desktop, toàn màn hình
trên điện thoại; giữ trên URL ?panel=):
- Sửa cấu hình: form trực tiếp Thời gian / Cách thi / Tùy chọn, Lưu,
  hỏi lại khi đóng chưa lưu; "Xóa đợt" cuối form khi chưa có lượt.
  Thay hộp "Sửa thông tin" và tab Thông tin.
- Cơ cấu đề: RoundStructure.
- Kết quả: Người dự thi / Theo đảng bộ / Theo câu hỏi; bộ lọc ngay trên
  bảng thay hộp Bộ lọc; Xuất Excel theo bộ lọc; "Xóa dữ liệu chạy thử"
  trong "⋯" khi xem dữ liệu thử. Thay trang /reports.
- Quản lý câu hỏi: RoundQuestions.

API (nhỏ):
- Danh sách đợt Admin trả thêm số liệu tóm tắt từng dòng (đã nộp, đang
  làm, tỷ lệ Đạt chính thức; Nháp: danh sách thiếu) và số đợt theo trạng
  thái; tính theo lô, không truy vấn từng dòng.
- API kết quả người dự thi nhận sort=latestAt&order=desc.
- Cập nhật validator, cURL, test.

Menu, route:
- Menu Admin: Đợt kiểm tra, Cài đặt chung (đổi tên "Hướng dẫn dự thi"),
  Tài khoản. Bỏ "Phiếu kết quả", "Trang chủ" khỏi menu Admin.
- Chuyển hướng (replace): /admin/exam-rounds/:id/reports →
  ?panel=results; ?tab=… → panel tương ứng/tổng quan; /admin/receipts →
  /admin/exam-rounds; /admin/receipts/:id → mở cửa sổ phiếu.

Kiểm tra: unit test hàm thuần (tóm tắt cấu hình/cơ cấu, "Cần làm", nhận
dạng mã phiếu, ánh xạ route/tab/panel cũ, bố cục theo bề rộng); test
backend số liệu tóm tắt (đúng số, chỉ chính thức, không N+1) và sort
latestAt; lint, build, backend pnpm test không lỗi. Đối chiếu trực quan
Admin 1440, 1024, 390: Nháp (chưa có câu / thiếu cơ cấu / đủ), Đang mở
có dữ liệu, Đã đóng; mở/đóng từng ngăn kéo, F5 khi đang mở ngăn kéo,
liên kết cũ /reports. Cập nhật README; báo rõ phần chưa kiểm được.
```
