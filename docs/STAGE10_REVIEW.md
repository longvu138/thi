# Giai đoạn 10 — kết quả triển khai và kiểm tra

Phạm vi: mục 14 giai đoạn 10 của PLAN. Không thêm migration, không thay nghiệp vụ sinh đề/chấm điểm/giới hạn lượt/snapshot. Không thao tác database thật. Bảng tạm báo cáo không lưu dữ liệu nghiệp vụ; MySQL cần quyền CREATE TEMPORARY TABLES.

| Yêu cầu | Kết quả | Bằng chứng |
| --- | --- | --- |
| Xác nhận trước start, đủ cấu hình và danh tính | Đạt | Mở modal QA chưa tạo lượt (vẫn 2 lượt fixture); xác nhận mới tạo lượt thứ 2 của người A |
| Tiếp tục lượt đang làm vào thẳng | Đạt | Chrome trở lại cùng ID lượt, đồng hồ tiếp tục; test API và hàm thuần |
| Trạng thái tham gia riêng, lý do khóa, sắp xếp đợt | Đạt | Test own-user, trial riêng, future/ended/limit/passed, thứ tự trước phân trang; Chrome thấy trạng thái và lý do |
| QR chuyển sang Admin, tải PNG/in | Đạt | USER không có QR; Admin tải PNG 13,2 KB thành công; preview in một trang tên đợt/QR/URL sau sửa CSS |
| Admin đăng nhập vào danh sách đợt | Đạt | Unit routing và Chrome /admin/exam-rounds |
| Câu hợp lệ/định mức, Mở/Đóng có xác nhận | Đạt | Cột số câu và hành động UI; regression mở thiếu câu bị từ chối, audit dùng luồng cập nhật hiện có |
| Theo đảng bộ, chuẩn hóa NFC/khoảng trắng/hoa-thường | Đạt | Integration gộp biến thể, giữ phân biệt dấu; tổng số khớp chi tiết; Chrome thử lọc từ dòng đảng bộ |
| Excel sheet Theo đảng bộ, cùng bộ lọc | Đạt | Integration đọc workbook bốn sheet, so sánh số liệu và filter chính thức/thử |
| Admin xem mọi lượt và snapshot chỉ đọc, audit | Đạt | Integration USER 403, anonymous 401, 422/404, pagination, snapshot; xem lượt quá giờ không tự chốt; Chrome xem lịch sử/chi tiết |
| cURL và README | Đạt | exam-rounds.curl, reports.curl, admin-attempts.curl; ba README cập nhật |
| Toàn bộ checklist trực quan | Chưa đủ | Chi tiết bên dưới; không coi test logic là kiểm tra hình ảnh |

## File liên quan chính

- Backend: `src/modules/exam-rounds/{exam-rounds.service,exam-rounds.controller,participation.logic}.js`, `src/utils/valid-questions-query.js`; `src/modules/reports/{committees.service,reports.service,reports.validator,reports.controller,reports.excel}.js`; `src/modules/attempts/attempts.admin.*.js`, `attempts.service.js`; route đợt và `src/app/routes.js`.
- Frontend: `pages/exam-rounds/{ExamRoundsPage,ExamRoundDetailPage}.jsx`, `components/attempts/{StartAttemptButton,AttemptSnapshotQuestions}.jsx, `components/exam-rounds/ParticipationSummary.jsx``, `components/exam-rounds/{RoundQrModal.jsx,round-qr-print.css}`, `components/reports/{CommitteeReport,AdminAttemptHistory,ReportTables}.jsx`, `pages/reports/RoundReportPage.jsx`; API/hooks và utils `examRounds`, `results`, `navigation` cùng test tương ứng.
- Test: `backend/src/database/stage10.integration.test.js`, `backend/src/modules/exam-rounds/participation.logic.test.js`; cập nhật test Excel báo cáo và unit frontend.

## Kiểm tra đã chạy

| Lệnh/kiểm tra | Kết quả |
| --- | --- |
| Backend `pnpm test` với tám DB test riêng | PASS 100/100, fail 0, skip 0 |
| Backend `pnpm test:database` với tám DB test riêng | PASS 15/15, fail 0, skip 0 |
| `node --check` 32 file backend liên quan | PASS |
| Frontend `pnpm test` | PASS 69/69, fail 0, skip 0 |
| Frontend `pnpm lint` | PASS |
| Frontend `pnpm build` sau sửa CSS in | PASS |
| Chrome thủ công trên DB QA riêng | PASS các luồng nêu trong bảng |

Lần gọi MySQL trong sandbox bị EPERM; đã chạy lại bằng quyền mạng local và pass. Lỗi CORS/preview cũ trong QA đã xử lý bằng tiến trình backend/preview riêng; không sửa cấu hình ứng dụng thật.

Biến DB dùng trong lần chạy (các database đã tạo rỗng riêng, prefix được test kiểm tra):

```bash
cd backend
export TEST_DB_NAME=exam_stage1_test_stage10
export TEST_PARTICIPANTS_DB_NAME=exam_participants_test_stage10
export TEST_QUESTIONS_DB_NAME=exam_questions_test_stage10
export TEST_ROUNDS_DB_NAME=exam_rounds_test_stage10
export TEST_ATTEMPTS_DB_NAME=exam_attempts_test_stage10
export TEST_REPORTS_DB_NAME=exam_reports_test_stage10
export TEST_RECEIPTS_DB_NAME=exam_receipts_test_stage10
export TEST_STAGE10_DB_NAME=exam_stage10_test_local
pnpm test
pnpm test:database
```

Mỗi integration tự dựng và rollback schema fixture của nó, không trỏ TEST_* vào database đang sử dụng. Cấu hình kết nối DB_HOST/PORT/USER/PASSWORD theo backend README.

## Chạy thử local

1. Chạy backend/frontend theo README trên database phát triển/test riêng; tài khoản MySQL có CREATE TEMPORARY TABLES.
2. ADMIN đăng nhập → danh sách đợt: kiểm số câu, Mở/Đóng với xác nhận. Mở QR từ danh sách hoặc chi tiết, tải ảnh/in preview. Muốn quét bằng điện thoại cần URL/IP LAN truy cập được, không dùng localhost.
3. USER nhập thông tin → Đợt kiểm tra: xem lượt/còn lại/lý do khóa. Bấm bắt đầu mở xác nhận, Hủy không tạo lượt; xác nhận mới bắt đầu. Quay lại danh sách để thử Tiếp tục.
4. ADMIN → Báo cáo: tab Theo đảng bộ → bấm dòng để lọc người → Xem các lượt → Chi tiết. Xuất Excel, so sánh sheet Theo đảng bộ với bộ lọc hiện tại; đổi Chính thức/Chạy thử trong Bộ lọc.

## Đối chiếu UI và phần chưa kiểm tra

Giữ layout, Ant Design, FormModal, Table/card và token hiện có. Chrome QA đã quan sát USER desktop khoảng 1512px, tablet 768px và mobile 390px (cao 740px): card, thông tin lượt, nút và lý do khóa đọc được, không thấy tràn ngang. Modal xác nhận desktop đủ thông tin; start và resume thao tác thành công. ADMIN desktop đã xem danh sách, QR, tải PNG, preview in/hủy, tab đảng bộ, lọc người, lịch sử và chi tiết snapshot; modal dài giữ header/footer, body cuộn.

Chưa đối chiếu toàn bộ viewport chính xác 1440/1024, dark mode, màn thấp và modal xác nhận trên mobile; chưa kiểm responsive ADMIN đầy đủ, quét QR bằng điện thoại thật, in giấy thật. Không dùng E2E/Playwright. Excel đã kiểm nội dung bằng integration, chưa tải qua nút UI. Các mục này là khoảng trống QA, không báo PASS.

Chưa phát hiện lỗi chức năng chặn MVP trong phạm vi test đã chạy. Điều kiện môi trường cần bảo đảm: quyền CREATE TEMPORARY TABLES. Không thực hiện Docker/VPS/backup-restore hoặc giai đoạn tiếp theo. Dừng chờ người dùng xác nhận.
