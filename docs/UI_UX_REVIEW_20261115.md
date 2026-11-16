# Rà soát UI/UX responsive — người dự thi

Ngày 15/11/2026. Phạm vi: cổng dự thi, làm bài, kết quả; kiểm thêm bước mở/in phiếu trong cùng luồng. Không kiểm responsive Admin theo chỉ đạo. Chỉ đánh giá, chưa sửa code giao diện hoặc nghiệp vụ.

## Môi trường và cách kiểm tra

Chrome trên macOS, DevTools Responsive tại các chiều rộng đã xác nhận 1440, 1024, 768, 390 CSS px. Cổng được quan sát ở chiều cao 900px; làm bài/kết quả chủ yếu 740px, modal bắt đầu kiểm cả 390×900 và 390×740. Đây là giả lập viewport, không phải kiểm trên iPhone/Android thật.

Dùng lại project/volume QA exam_s13_qa đã có, web localhost:3183 và DB exam_load_test_stage13; không tạo DB mới, không đổi .env dev. Tạo fixture E2E riêng với hai đợt đồng thời (một chính thức giả, một chạy thử), 50 câu/đề, 3 phương án, tên dài và có câu/đáp án dài. Danh tính E2E_UI_20261115 Responsive. Không làm bài bằng phiên người dùng đang mở tại localhost:3110.

## Những điểm nên chỉnh (theo ưu tiên)

| Mức | Phát hiện trực tiếp | Đề xuất | File sở hữu |
|---|---|---|---|
| P1 — khả năng đọc | Khi cuộn màn làm bài ở 1024px, thanh đồng hồ/title cố định có nền trong suốt; chữ câu hỏi và thông tin navigator phía dưới nhìn xuyên qua, tạo cảm giác chữ chồng nhau. | Dùng nền đặc cho riêng thanh sticky, giữ token sáng/tối; kiểm lại z-index và khoảng cuộn. Không đổi glass-card toàn ứng dụng. | `frontend/src/pages/attempts/attempts.css`, `frontend/src/layouts/participant-layout.css`, `.glass-card` trong `frontend/src/styles/dashboard-and-mobile.css` |
| P2 — không gian làm bài | 390×740: header và card tên đợt/đồng hồ chiếm nhiều chiều cao, tên dài xuống dòng và khoảng thông báo trống còn lớn; chỉ thấy một phần đáp án trước khi phải cuộn. | Thu gọn toolbar mobile, tên tối đa hai dòng, ưu tiên đồng hồ/nộp; giữ vùng thông báo ổn định nhưng bố trí gọn. | `frontend/src/pages/attempts/AttemptPage.jsx`, `attempts.css`, `participant-layout.css` |
| P2 — mã phiếu dễ bị bỏ sót | 390/768/1024px: chín thống kê xếp một cột; mã tra cứu nằm ở card sau toàn bộ thống kê và ba nút. Người dùng phải cuộn khá xa mới thấy mã. 1440px gọn hơn nhờ ba cột. | Đưa mã và thao tác sao chép/in lên gần trạng thái đã nộp; thống kê chi tiết đặt sau. Có thể dùng hai cột trên tablet khi đủ chỗ. | `frontend/src/pages/results/AttemptResultPage.jsx` |
| P2 — vào thi trên mobile | Cổng 390px xếp giới thiệu → đợt mở → hướng dẫn → form; khi có hai đợt, form nằm sâu. 768px vẫn hai cột nên form hẹp, nhiều đoạn xuống dòng. | Trên mobile ưu tiên chọn đợt rồi nhập thông tin, rút gọn giới thiệu/hướng dẫn; cân nhắc chuyển một cột sớm hơn trên tablet hẹp, giữ desktop hiện tại. | `frontend/src/pages/auth/LoginPage.jsx`, `participant-entry.css` |
| P3 — tính nhất quán | Câu đã trả lời có viền đỏ ở navigator trên trang, nhưng xanh trong drawer mobile. Drawer còn lặp tiêu đề “Danh sách câu hỏi” ở cả header và card, chiếm thêm chỗ. | Chọn cùng một cách biểu thị trạng thái cho cả hai nơi, thêm chú giải; bỏ tiêu đề card lặp trong drawer. | `frontend/src/components/attempts/AttemptNavigator.jsx`, `attempts.css`, `participant-layout.css` |
| P3 — thứ bậc thao tác | Màn kết quả có cả “Phiếu kết quả / In phiếu” và “Lịch sử đợt này” là nút primary đỏ. | Giữ in phiếu là hành động chính, lịch sử dùng nút thường. | `frontend/src/pages/results/AttemptResultPage.jsx` |

Nguyên nhân nền sticky đã đối chiếu code: `.glass-card` đặt background alpha 0.75 với `!important`, thắng nền đặc trong `.participant-session .glass-card.ant-card`. Màu navigator khác nhau do rule trong `.participant-session` không đi theo drawer portal bên ngoài wrapper đó.

## Kết quả kiểm tra

| Kịch bản | Kết quả | Giới hạn |
|---|---|---|
| Cổng: 1440/1024/768/390px, hai đợt và trạng thái rỗng | PASS về bố cục cơ bản | Có các điểm UX bên trên; chưa thấy tràn ngang rõ rệt |
| Form bỏ trống | PASS | Thông báo tiếng Việt tại ba trường |
| Nhập danh tính E2E và vào danh sách | PASS | Chỉ dữ liệu QA |
| Xác nhận trước start trên 390×740 | PASS | Nội dung và footer quan sát được trong viewport |
| Làm bài: 1440/1024/768/390px | PASS một phần | Đọc/chọn được; FAIL tiêu chí nền sticky không lẫn nội dung khi cuộn |
| Chọn đáp án, tự sang câu | PASS | Câu 1 chọn A, chuyển câu 2, hàng chờ đồng bộ hiển thị bằng icon |
| Drawer 50 câu, nhóm, đã/chưa trả lời | PASS phần đã xem | Mở được, không bị thanh đáy che; chưa thao tác tới câu cuối; có bất nhất màu/tiêu đề lặp |
| F5 khi đang làm | PASS | Browser hỏi xác nhận reload; trở lại đúng câu 2, tiến trình còn tồn tại |
| Xác nhận nộp với 49 câu bỏ trống | PASS | Header/footer vẫn hiện, phần danh sách dài nằm trong body cuộn |
| Nộp đến màn kết quả | PASS | Chuyển thẳng /result; không bị cảnh báo rời bài chặn kết quả |
| Kết quả 1440/1024/768/390px | PASS về hiển thị | 1 đúng + 0 chọn sai + 49 bỏ trống = 50; mã và nút tồn tại; chưa tối ưu ưu tiên trên mobile/tablet |
| Mở phiếu và print preview | PASS với fixture | Một trang, đủ nội dung/chữ ký sau khi bỏ Headers and footers; không gửi lệnh in hoặc lưu PDF |
| Responsive Admin | SKIP | Ngoài phạm vi người dùng yêu cầu |
| Dark mode, máy thật iOS/Android, bàn phím ảo, xoay máy, mức phóng chữ hệ thống | SKIP | Chưa kiểm trực tiếp; không suy ra từ viewport giả lập |
| Mất mạng/3G, hết giờ tự chốt, lỗi server, mọi trạng thái Đạt/Không đạt/trial | SKIP trong phiên này | Chưa kiểm ma trận đầy đủ; không lấy unit test cũ thay cho bằng chứng UI |
| Lint/unit test | SKIP | Không sửa code; build frontend đã chạy trong quá trình dựng lại stack QA |

## Tái hiện ưu tiên

1. Bắt đầu lượt E2E ở viewport 1024px, cuộn xuống phần đáp án: quan sát chữ đi xuyên qua card đồng hồ/title.
2. 390×740 với tên đợt dài: so phần chiều cao toolbar/header với diện tích còn lại cho đáp án.
3. Nộp bài rồi mở kết quả 390px: kiểm số lần cuộn để đến mã tra cứu và nút in; so với 1440px.
4. So nút câu đã trả lời trong navigator desktop với cùng câu trong drawer mobile.

Chưa áp dụng các đề xuất. Không đổi chấm điểm, snapshot, giới hạn lượt hoặc dữ liệu nghiệp vụ đang dùng. Giữ fixture QA để đối chiếu, không tự xóa schema/volume. Không coi kết quả này là xác nhận không còn mọi lỗi UI/UX.

Sau kiểm tra đã dừng stack QA, giữ lại volume và fixture; ứng dụng local cổng 3110 không bị dừng.
