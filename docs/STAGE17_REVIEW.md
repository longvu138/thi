# Giai đoạn 17 — phân hệ Đợt kiểm tra Admin

Phạm vi: bố cục Admin và hai bổ sung API trực tiếp (tóm tắt theo lô, sort kết quả). Không migration; không đổi start/submit/chấm điểm, giới hạn lượt, snapshot, phân quyền hay quy tắc audit. Không chạy thao tác trên DB.

## Đã triển khai

- Một route workspace `/admin/exam-rounds/:id?`: >=1200px danh sách cuộn riêng bên trái và tổng quan phải; dưới 1200px danh sách → tổng quan. Chọn dòng đổi URL bằng router, không tải lại website. Tạo chỉ hỏi tên, dùng mặc định hiện có, chọn đợt mới và mở cấu hình.
- Lọc Đang mở mặc định/Nháp/Đã đóng có số lượng; search tên hoặc mã phiếu đúng định dạng. Mã tìm qua API Admin hiện có, mở `AttemptReceiptModal` (cùng ReceiptModal) và giữ kiểm tra quyền/audit.
- Mỗi dòng có tên và tóm tắt số liệu/phần thiếu; menu ⋯ Mở/Đóng/QR/Xóa. Chỉ hiện Xóa khi không có bất kỳ lượt nào, kể cả thử; Backend vẫn kiểm tra khi thực thi.
- Tổng quan xếp dọc: đầu trang; số liệu chính thức/Cần làm; cấu hình; cơ cấu; 10 đảng bộ đông nhất; 10 người vừa nộp; số câu/nghị quyết và 5 câu tỷ lệ đúng thấp nhất. Đợt đang mở refresh khoảng 30 giây. Tỷ lệ Đạt tính người có ít nhất một lượt chính thức Đạt chia số người đã tham gia chính thức.
- Drawer config/structure/results/questions giữ trong `?panel=`; mobile toàn màn hình. Cấu hình hỏi bỏ thay đổi khi đóng/chuyển đợt chưa lưu, form không bị poll nền ghi đè. Cơ cấu/câu hỏi dùng lại component cũ, kết quả dùng lại ReportTables/CommitteeReport/AdminAttemptHistory; lịch sử có nút mở phiếu.
- Kết quả có bộ lọc inline, Excel theo bộ lọc đã áp dụng, menu xóa toàn bộ dữ liệu thử có xác nhận chỉ hiện khi đang lọc dữ liệu thử. Không đổi phạm vi xóa hiện có.
- Menu Admin: Đợt kiểm tra / Cài đặt chung / Tài khoản. Trang hướng dẫn in và cấu hình hỗ trợ vẫn dùng source/API cũ.
- Redirect replace: `/reports` → `?panel=results`; `?tab=overview|structure|questions` → config/structure/questions; tab lạ → tổng quan; `/admin/receipts` → workspace; `/admin/receipts/:attemptId` → workspace với modal phiếu. Không tự in/tải.

## API và số liệu

`GET /api/admin/exam-rounds` bổ sung `statusCounts` theo search trước khi lọc status; từng dòng có:

- `summary`: inProgressCount, submittedCount, participantCount, passedCount, passRate, attemptCount (chính thức), hasAttempts (cả chính thức/thử).
- submittedCount = SUBMITTED + EXPIRED. Không gọi “chưa hoàn thành” là đang làm; không suy số lượt từ số người.
- `missing`: label/panel; `totalValidQuestionCount` tính mọi nhóm hợp lệ và `groupCount`. Giữ validQuestionCount/structureSufficient hiện có.

Một truy vấn con gom theo round/user, truy vấn ngoài gom round; một query attempts cho mọi ID trên trang. Câu hợp lệ vẫn gom theo lô như trước. Không có query attempts riêng cho từng dòng. Chi tiết Admin dùng cùng helper để số liệu đồng nhất. Query chỉ đọc; không tự chốt lượt qua API Admin.

`GET .../results?sort=latestAt&order=desc` sắp theo MAX(submitted_at) của người trong loại dữ liệu/bộ lọc đã chọn trước limit/offset, ID phá hòa ổn định. Với sort này, latestAt là lần nộp cuối (null nếu chưa nộp), thêm latestSubmittedAt; các cách xem cũ giữ latestAt cũ. Điểm cao nhất/kết quả cuối/thống kê không đổi. Tổng quan chỉ hiện người đã có thời điểm nộp. Đảng bộ dùng API cũ, đọc theo trang 100, sắp số tham gia giảm dần rồi lấy 10; không lấy 10 tên đầu bảng làm top 10.

## Kiểm tra bằng code

- Unit Backend: serialize số liệu, trial-only không làm tăng người chính thức, SQL gom người/đợt, một query cho 100 ID, empty ID không query, danh sách thiếu; validator latestAt và SQL order trước phân trang.
- Bổ sung regression trong `reports.integration.test.js`: số liệu 3 lượt chính thức/2 người/1 người Đạt, loại lượt thử, statusCounts, một query attempts cho danh sách và trang latestAt. **Chưa chạy** suite này vì cần DB test rỗng và dựng/xóa schema.
- Unit Frontend: tóm tắt cấu hình/cơ cấu, Cần làm, nhận dạng mã mới/cũ, threshold bố cục, mapping route/tab/panel, metadata danh sách và menu Admin.
- Không dùng browser, không tạo/reset/migrate/seed DB. Backend test chạy với TEST_*DB_NAME không bật; không thay DB_NAME của ứng dụng.

## Người dùng tự thử

Chạy `pnpm dev`, vào `/admin/login` → Đợt kiểm tra trên dữ liệu dev phù hợp:

1. 1440px: danh sách/tổng quan hai cột; 1024/390: danh sách sang tổng quan, link quay lại; danh sách giữ cuộn riêng.
2. Nháp chưa câu/thiếu cơ cấu/đủ: Cần làm, tooltip khóa Mở, tạo tên rồi điền cấu hình, mở QR và xác nhận Mở/Đóng. Không chạy thử trên dữ liệu thật.
3. Mở từng drawer, đóng, F5 và link có `?panel=`; sửa cấu hình rồi đóng/chuyển đợt phải hỏi lại, hủy giữ dữ liệu đang sửa; lưu xong không hỏi nữa.
4. Đang mở có dữ liệu, Đã đóng: đối chiếu số liệu chính thức với báo cáo; thử dữ liệu thử không làm tăng các số này. Kiểm tra top đảng bộ và người vừa nộp.
5. Kết quả: lọc → Áp dụng → Excel; chọn đảng bộ → người dự thi → lịch sử → Phiếu. Lọc thử mới thấy menu xóa thử; không thực hiện xóa trên dữ liệu thật.
6. Tìm mã mới/cũ/không tồn tại; mở link cũ reports/tab/receipts; đóng phiếu giữ trang hiện tại. Import có nghị quyết mới → sang cơ cấu, thử preview và khóa sau lượt chính thức.

Toàn bộ đối chiếu trực quan, thao tác Drawer/F5/in/PDF trên browser **SKIP theo yêu cầu**. Unit/SQL compilation không phải bằng chứng MySQL integration hoặc UI đã chạy thực tế.

## Kết quả đã chạy

| Kiểm tra | Kết quả |
|---|---|
| Frontend `pnpm test` | PASS — 112 test |
| Frontend `pnpm lint` | PASS — không lỗi/cảnh báo |
| Frontend `pnpm build` | PASS |
| Backend `pnpm test` (TEST_*DB_NAME không bật) | PASS — 113; FAIL 0; SKIP 9 integration |
| Syntax Backend và regression integration bổ sung | PASS |
| MySQL integration/schema | SKIP — suite dựng/xóa bảng, không chạy trên DB dev |
| Browser 1440/1024/390, light/dark, Drawer/F5/in | SKIP — người dùng yêu cầu chỉ kiểm tra code |

Không còn thiếu phần triển khai đã giao; chưa có bằng chứng chạy integration MySQL và UI thực tế. Không triển khai giai đoạn sau.
