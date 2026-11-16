# Giai đoạn 11 — Cơ cấu đề

Phạm vi PLAN mục 6 “Cơ cấu đề” và mục 14 giai đoạn 11. Đã thay toàn bộ chia đề ba chế độ/bộ đề tạo trước. Không thay chấm điểm, giới hạn lượt, chạy thử, chốt hết giờ hoặc snapshot lịch sử. Không thực hiện giai đoạn tiếp theo.

## Đối chiếu yêu cầu

| Yêu cầu | Kết quả |
| --- | --- |
| Chỉ RANDOM/BY_GROUP, sinh ngẫu nhiên mỗi lượt | Đạt |
| Xóa API/UI/test tạo-xóa-xem bộ đề; bỏ bảng/cột khóa cũ | Đạt; test phủ định xác nhận API cũ 404 và bảng/cột không tồn tại |
| Migration 202611130001 chỉ selection_config, down đầy đủ | Đạt; các DB test dựng mới và rollback về rỗng |
| GET cơ cấu + nhóm/validCount/count/order/isNew/locked | Đạt |
| PUT kiểm tra đủ câu, lỗi từng dòng, Backend tính question_count | Đạt; API tạo/sửa đợt từ chối questionCount/selectionConfig |
| POST xem mẫu cấu hình chưa lưu, ADMIN, audit, không ghi DB/lượt | Đạt |
| Nhóm mới mặc định 0 và làm nổi; áp dụng k/tổng/lỗi/thứ tự | Đạt |
| BY_GROUP giữ thứ tự nghị quyết, đảo trong nhóm | Đạt; normalization NFC/khoảng trắng/hoa-thường, giữ dấu |
| Khóa khi có lượt chính thức, lượt thử không khóa | Đạt; message đúng yêu cầu, round lock đồng bộ với start |
| Bảo vệ OPEN khi xóa/vô hiệu hóa/đổi nhóm làm thiếu | Đạt, rollback; Mở nhanh dùng cùng kiểm tra |
| Danh sách đợt số câu tính từ cơ cấu, báo thiếu từng nhóm | Đạt; validQuestionCount theo nhóm lấy >0, structureSufficient kiểm từng nhóm |
| Snapshot cũ không đổi sau sửa cơ cấu chạy thử/sửa câu | Đạt |
| README/cURL và ghi chú PAPERS_REVIEW đã thay thế | Đạt |
| UI đối chiếu trực quan toàn checklist | Chưa kiểm bằng browser theo chỉ đạo trước của người dùng; không báo PASS hình ảnh |

## File liên quan

- Backend: `modules/exam-rounds/structure.{logic,selection,service,controller}.js`, route/validator/service đợt; `modules/attempts/attempts.service.js`; `modules/questions/questions.service.js`; middleware lỗi chỉ công bố groupErrors từ AppError STRUCTURE_INVALID.
- Database: `migrations/202611130001_round_papers.js` chỉ cột selection_config; `database/test-foundation.js`, `test-rounds.js` và các integration liên quan. Không có migration mới ngoài sửa migration được yêu cầu.
- Frontend: `components/exam-rounds/RoundStructure.jsx`, trang chi tiết/danh sách đợt, form đợt; `api/structureApi.js`, `hooks/useStructure.js`, `hooks/useQuestions.js`, `utils/structure.js`, constants/payload đợt và test.
- Xóa toàn bộ papers.logic/selection/service/controller và unit/integration tạo bộ đề; RoundPaperSettings, papersApi/usePapers, utils/papers và test; curl/papers.curl. Không giữ alias các API cũ.
- cURL: `curl/structure.curl`, cập nhật `curl/exam-rounds.curl`. README root/backend/frontend, UI_REFERENCE cập nhật; PAPERS_REVIEW.md có thông báo đã thay thế.

## API và chạy thử

1. Khởi động lại Backend để nạp DB_NAME mới, đăng nhập Admin lại. Dev mới `exam_stage11_dev` đã migrate đầy đủ, có 1 tài khoản Admin chuyển từ dev cũ; giữ cách đăng nhập hiện có. Chưa có đợt/câu hỏi/lượt trong dev mới. Database nguồn `bai_thi` giữ nguyên, không xóa/sửa dữ liệu nguồn. Lần kiểm tra bảo vệ đầu tiên đã dừng trước khi ghi do tên DB khác dự kiến, sau đó xác minh đúng NODE_ENV=development, host localhost, nguồn bai_thi rồi mới dựng dev mới/cập nhật backend/.env.
2. Tạo đợt Nháp (không có ô số câu) → Câu hỏi → thêm/import → Cơ cấu đề.
3. RANDOM: nhập 50 khi có 300 câu hợp lệ. BY_GROUP: nhập k=3 → Áp dụng cho tất cả với 10 nhóm có 10 câu → tổng 30; sửa riêng dòng nếu cần; nhóm 0 không xuất hiện. Đổi thứ tự bằng lên/xuống.
4. Xem thử 1 đề mẫu trước khi lưu, kiểm đủ câu/đáp án/thứ tự; Lưu rồi mở đợt từ danh sách. Nhóm import thêm sau đó hiện “Nhóm mới”, lấy 0. Nếu đang OPEN, cơ cấu mới cũng phải đủ câu ngay khi lưu.
5. Người thi bắt đầu lượt theo luồng cũ; có lượt chính thức thì tab cơ cấu chỉ đọc. Lượt chạy thử vẫn cho sửa cơ cấu; lượt đã tạo luôn dùng snapshot trước đó.

GET `/api/admin/exam-rounds/:id/structure` trả selectionConfig/questionCount/groups/locked. PUT và POST `/preview` nhận `{mode:'RANDOM',count:50}` hoặc `{mode:'BY_GROUP',groups:[{category,count,order}]}`. selection_config lưu đúng mode/groups; RANDOM count lưu trong question_count. Câu được lấy ngẫu nhiên bằng reservoir sampling và crypto.randomInt; mỗi lô 100 câu, chỉ giữ số câu cần. Tối đa 1000 nhóm để giới hạn cấu hình/catalog trong RAM. Không nhận lại các trường delivery/paperCount hoặc mode cũ.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Backend `pnpm test` với 9 DB test riêng | PASS 113/113; fail 0, skip 0 |
| Backend `pnpm test:database` với 9 DB test riêng | PASS 18/18; fail 0, skip 0 |
| Unit logic cơ cấu/validator trực tiếp | PASS 6/6 |
| Syntax 19 file backend liên quan | PASS |
| Frontend `pnpm test` sau bản sửa cuối | PASS 74/74; fail 0, skip 0 |
| Frontend lint/build sau bản sửa cuối | PASS |
| Dựng dev mới bằng migrate:latest, kiểm metadata schema | PASS; có selection_config, không bảng/cột cũ |
| UI browser, desktop/tablet/mobile, light/dark/màn thấp | SKIP theo yêu cầu trước “không cần test UI browser”; chưa có xác minh hình ảnh |

Dùng TEST_DB_NAME=exam_stage1_test_stage10, TEST_PARTICIPANTS_DB_NAME=exam_participants_test_stage10, TEST_QUESTIONS_DB_NAME=exam_questions_test_stage10, TEST_ROUNDS_DB_NAME=exam_rounds_test_stage10, TEST_ATTEMPTS_DB_NAME=exam_attempts_test_stage10, TEST_REPORTS_DB_NAME=exam_reports_test_stage10, TEST_RECEIPTS_DB_NAME=exam_receipts_test_stage10, TEST_STAGE10_DB_NAME=exam_stage10_test_local, TEST_STRUCTURE_DB_NAME=exam_structure_test_local. Mỗi database có guard prefix, phải rỗng trước test, tự dựng/rollback; không dùng TEST_PAPERS_DB_NAME cũ.

Integration mới kiểm 10×10 lấy 3, RANDOM 300 lấy 50, không trùng, nhóm 0, đúng thứ tự kể cả shuffle, normalization, thiếu câu theo nhóm, lưu/xem mẫu, dữ liệu DB trước/sau mẫu, USER 403/anonymous 401/CSRF 403, 422 theo dòng, audit, khóa chính thức, trial không khóa và snapshot. Các fixture cũ đặt số câu trước khi seed bằng helper chỉ test; không phải API tương thích và không bỏ kiểm tra mới trong ứng dụng.

Rà soát UI bằng code: tái sử dụng Radio/Form/InputNumber, Table từ 1200px/card dọc dưới 1200px, Space wrap, tên/nội dung dài overflow-wrap, FormModal dùng chung có body cuộn và header/footer cố định. Chưa xác minh trực quan các viewport 1440/1024/768/390, dark mode và modal thấp. Không dùng Playwright/E2E.

## Phần còn thiếu

Không phát hiện lỗi chức năng chặn trong phạm vi kiểm tra đã chạy. Còn QA trực quan UI được bỏ qua theo chỉ đạo. Dev mới cần khởi động lại Backend và đăng nhập lại, sau đó nhập dữ liệu thử qua UI như bình thường. Không tự import file người dùng vào database. Dừng chờ xác nhận.
