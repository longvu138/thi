# Tham khảo giao diện Trắc Nghiệm Trực Tuyến

> Kiểm tra hiện hành theo AI_RULES.md: AI giữ component/token/pattern qua rà soát code; người dùng tự đối chiếu hình ảnh và responsive. Không tự mở browser để test. Các ghi nhận browser bên dưới là lịch sử các phiên trước.


Nguồn tham khảo: https://github.com/tracnghiemtuyenquang/danhgia-nq4, commit `3259f1a` (đọc source, không chạy SQL hay kết nối Supabase của repository tham khảo).

## Kết quả phân tích

- `index.html` gộp HTML/CSS/JavaScript cho trang chủ, form thông tin người tham gia, làm bài, kết quả và bảng xếp hạng. Giao diện dùng Be Vietnam Pro, nền kem, header đỏ chuyển sắc, điểm nhấn vàng, card trắng bo tròn. Desktop chia giới thiệu/form thành hai cột trong khung rộng 1240px, màn nhỏ xếp dọc.
- `assets/` chứa logo ngành Tuyên giáo, hoa văn trống đồng và hình nền mang địa danh Tuyên Quang. Đây là nhận diện của nguồn mẫu, không dùng làm logo của Trắc Nghiệm Trực Tuyến.
- `admin.html` có đăng nhập riêng và điều hướng bằng tab cho tổng hợp, người tham gia, câu hỏi, đảng bộ và cài đặt. Các form chỉnh sửa dùng hộp thoại.
- `config.js` cấu hình Supabase; xử lý dữ liệu/chấm điểm gọi RPC phía Supabase. Luồng bài thi mẫu có lưu trạng thái ở localStorage. Source hiện tại dùng Express/Knex/MySQL, cookie phiên và không lưu đề/đáp án trên localStorage, nên chỉ áp dụng cách trình bày.
- Form mẫu có thêm chức vụ/đơn vị công tác/lãnh đạo và chọn đảng bộ từ danh sách. Trắc Nghiệm Trực Tuyến giữ đúng yêu cầu đã chốt: ba ô văn bản họ tên, đảng bộ, chi bộ.

## Phần đã áp dụng

- Tên hiển thị, tiêu đề tab: `Trắc Nghiệm Trực Tuyến`. Biểu trưng chữ VPTW dạng SVG, thay favicon cũ; không phải logo chính thức của một đơn vị.
- Trang `/login`: header đỏ–vàng; ADMIN truy cập trực tiếp `/admin/login`, phần giới thiệu và hướng dẫn bên trái, card nhập thông tin bên phải. Các bước tham gia thay cho số liệu cố định của mẫu.
- CSS scoped trong `frontend/src/pages/auth/participant-entry.css`, hỗ trợ light/dark và bố cục một cột dưới 768px. Giữ Form/Input/Button của Ant Design và luồng `/auth/enter` hiện có.
- Quản trị, ngân hàng câu hỏi, đợt kiểm tra, các Modal và API giữ cấu trúc hiện tại. Tên nhận diện dùng chung trong `frontend/src/constants/app.js`.

## Phạm vi chưa triển khai

Không thêm số liệu thống kê giả, bảng xếp hạng, tài liệu, QR, màn trình chiếu hoặc cơ chế làm bài chỉ để giống mẫu. Các phần làm bài/kết quả/báo cáo tiếp tục theo giai đoạn trong PLAN. Chưa thay bố cục toàn bộ khu quản trị sang tab như repository tham khảo.

## Kiểm tra

Giai đoạn 5: lint, unit test và build frontend đã pass. Đã kiểm tra bằng Chrome trên dữ liệu giả lập trong database test riêng: bắt đầu lượt, chọn đáp án, tự lưu, F5 giữ lượt và đáp án, xác nhận nộp và hiển thị đã ghi nhận. Đã quan sát bố cục desktop khoảng 1512px, tablet khoảng 815px và mobile giả lập 412px; chưa xác minh chính xác các mốc 1440/1024/768/390, màn thấp, dark mode và toàn bộ trạng thái ADMIN. Các tình huống mất mạng/hàng đợi lưu được kiểm tra bằng unit test, chưa đối chiếu thủ công trong trình duyệt. Không xem rà soát CSS là thay thế kiểm tra trực quan còn thiếu.

Giai đoạn 5 đã thêm màn làm bài dùng Ant Design/layout/card/token hiện có: câu hỏi và lựa chọn rõ ràng, đồng hồ/nút nộp, lưới câu gom nhóm bên phải trên desktop và phía dưới trên tablet/mobile. Không lấy dữ liệu hoặc cơ chế lưu localStorage từ source tham khảo. Chỉ có trạng thái kết thúc tối thiểu; kết quả chi tiết và bảng xếp hạng chưa làm.

Giai đoạn 6 bổ sung lịch sử cá nhân và kết quả từng lượt trong layout hiện có, dùng Card/Tag/Descriptions, Table từ 1200px và card dọc trên màn nhỏ. Kết quả hiển thị lựa chọn của người dự thi, chỉ đánh dấu đáp án đúng khi server cho phép theo snapshot. Đã đối chiếu luồng danh sách → lịch sử → chi tiết trên Chrome với dữ liệu E2E ở database test riêng; quan sát desktop khoảng 1512px, vùng tablet khoảng 815px và mobile giả lập 412px. Phát hiện và sửa ép chữ thống kê ở tablet, đã xem lại sau sửa. Chưa đối chiếu đầy đủ dark mode, màn thấp và chính xác các mốc 1440/1024/768/390; phân quyền ADMIN/USER được kiểm bằng unit/HTTP integration, chưa đối chiếu toàn bộ trạng thái ADMIN bằng mắt. Không làm báo cáo hoặc dashboard quản trị.

## Cổng dự thi sau khi nhập thông tin

Theo yêu cầu giao diện làm bài gần source tham khảo, USER đã chuyển sang `ParticipantLayout`: header/logo Trắc Nghiệm Trực Tuyến đỏ–vàng, nền kem, khung giữa màn hình và không có sidebar quản trị. Luồng nhập thông tin → chọn đợt → làm bài → kết quả dùng cùng nhận diện. Trang làm bài có đồng hồ, thẻ lựa chọn A/B/C/D, thông tin người dự thi và tiến độ theo nhóm; mobile xếp một cột. Giữ Ant Design, API thật và cơ chế lưu RAM/server hiện có; không sao chép lưu đề ở localStorage từ mẫu. ADMIN vẫn ở layout quản trị.

Đã quan sát desktop khoảng 1512px, vùng tablet 815px và mobile 412px trên Chrome với dữ liệu test riêng. Đã thử chọn đáp án, tự lưu, cập nhật tiến độ và xem lại bản sửa tràn ngang mobile. Unit test layout/route, lint và build được chạy. Chưa đối chiếu đầy đủ dark mode, màn thấp và các mốc chính xác của checklist; không coi CSS là xác minh những phần còn thiếu.

## Báo cáo ADMIN theo đợt (giai đoạn 7)

Giữ layout quản trị, Card/Statistic, Table từ 1200px và card dọc dưới 1200px. Bộ lọc nằm trong FormModal dùng chung; các bộ lọc đã áp dụng được ghi bằng nhãn trên trang. Có dashboard, bảng người, tab Theo câu hỏi, xuất Excel và chức năng xác nhận xóa lượt thử qua API có sẵn. Không đổi cổng người dự thi.

Đã xem Chrome ở desktop khoảng 1512px, vùng tablet khoảng 815px và mobile giả lập 412px: mở báo cáo, lọc không có kết quả rồi xóa lọc, xem số liệu và tab câu hỏi; xem card chi tiết mobile và Modal lọc. Đã thu gọn bộ lọc vào Modal và điều chỉnh container/card nhỏ. Chưa đối chiếu đủ dark mode, màn thấp và chính xác các mốc 1440/1024/768/390; chưa thao tác xóa thử hoặc tải Excel qua UI, các API xóa thử có test giai đoạn 4 và export có integration kiểm nội dung file/audit giai đoạn 7. Kiểm tra API ADMIN/USER/chưa đăng nhập bằng HTTP integration; không nhận những phần UI chưa xem là đã pass. Dữ liệu QA nằm trong database test riêng, dọn sau khi thử.

## Câu hỏi riêng theo đợt (giai đoạn 8)

ADMIN bỏ menu/trang ngân hàng riêng và ô chọn nhóm trong form đợt. Chi tiết đợt có tab Thông tin/Câu hỏi; tái sử dụng QuestionFormModal, QuestionImportModal, FormModal, glass-card, Table/card và token hiện có. Tab quản lý câu có tìm kiếm, lọc nhóm văn bản trong đợt, số câu hợp lệ/số câu mỗi bài, tải mẫu, import và xuất Excel. USER không có tab quản lý; cổng dự thi giữ nguyên.

Đã mở Chrome với tài khoản E2E trên database MySQL QA độc lập trong /tmp, xem chi tiết đợt và tab Câu hỏi ở desktop khoảng 1512px: menu, số câu, bộ lọc và bảng hiển thị đúng. Không kiểm responsive ADMIN theo chỉ đạo người dùng trong phiên này. Chưa đối chiếu trực quan dark mode, modal/màn thấp và toàn bộ luồng ghi qua UI; nghiệp vụ API/Excel/phân quyền có integration test. Bản cuối: frontend lint, 58 unit test và build pass; backend 85 test gồm unit/security/integration trên sáu database rỗng riêng pass, không skip. MySQL và backend/frontend QA riêng đã dừng sau kiểm tra. Không thay đổi dữ liệu thật, không triển khai giai đoạn 9.

## Sửa cuộn trang vào thi

`body` và `#root` trước đó cùng khóa overflow, khiến nội dung cổng dự thi dài bị cắt. Đổi riêng `#root` sang cuộn dọc khi cần trong `frontend/src/index.css`; giữ vùng cuộn riêng của layout ADMIN. Đã thử bản build trên Chrome ở viewport Pixel 9 412×924: cuộn từ phần giới thiệu xuống form, thấy đủ ba ô và nút Vào thi. Frontend lint, 58 unit test và build pass. Không kiểm responsive ADMIN theo yêu cầu người dùng; chưa đối chiếu dark mode và các viewport khác cho bản sửa này. Không thay đổi dữ liệu.

## QR đợt kiểm tra phía người dự thi

Theo yêu cầu bổ sung của người dùng, danh sách USER chỉ lọc trạng thái OPEN, bỏ lựa chọn xem CLOSED. Mỗi đợt có nút Mã QR mở FormModal/QRCode của Ant Design, giữ màu/token hiện có. Link dẫn qua nhập thông tin và trở lại đúng đợt; hỗ trợ đổi địa chỉ website khi dùng trên điện thoại. Không chứa phiên hay danh tính trong QR.

Đã xem Chrome desktop khoảng 1512px và mobile giả lập Pixel 9 412×924: danh sách chỉ có đợt mở, modal có mã, link và footer đóng hiển thị trong viewport. Frontend lint/build và 61 unit test pass. Chưa quét bằng camera điện thoại thật, chưa đối chiếu tablet/dark/màn thấp và đủ mốc checklist. Không kiểm responsive ADMIN theo yêu cầu trước đó. Unit test kiểm tra lọc OPEN, URL QR, giữ đợt khi nhập thông tin và từ chối redirect ngoài.

## Phiếu kết quả theo mẫu người dùng

Bổ sung luồng cơ bản: kết thúc lượt → mã xác nhận và nút Phiếu kết quả / In phiếu → hộp thoại in/Lưu PDF. Ngoài phiên, trang `/receipts` nhận mã rồi hiển thị cùng phiếu để in lại; liên kết từ trang vào thi. Bản A4 dùng Times New Roman, quốc hiệu Đảng bên phải, tên đảng bộ/chi bộ bên trái, tiêu đề đỏ, bảng thông tin theo mẫu và ô ký chi ủy. Tiêu đề lấy tên đợt, địa danh để trống; không tạo chữ ký/con dấu tự động. Màn thao tác dùng Card/Form/Input/Button/Alert và token hiện có; phiếu giữ nền trắng khi in.

Đã tra cứu công khai trên Chrome bằng phiếu demo E2E, xem preview in có **1 trang A4**, đủ bảng và phần chữ ký, không in toolbar/form điều hướng. Trình duyệt có tùy chọn Đầu trang/chân trang riêng nên UI hướng dẫn bỏ chọn để giống mẫu. Chưa in trên máy in vật lý; chưa đối chiếu đầy đủ tablet/mobile/dark/màn thấp của tính năng này. Không kiểm responsive ADMIN theo chỉ đạo trước đó.

Bản cuối: backend 88/88 test pass, không skip, gồm unit/security và integration trên bảy database test riêng; frontend lint, 63/63 unit test và build pass. Migration mới chỉ thêm bảng phiếu; đã áp dụng trên local, không reset dữ liệu cũ. Phiếu demo được cấp cho lượt E2E đã có để xem mẫu; không sửa điểm/kết quả đã chấm. Mã tra cứu là quyền xem phiếu, chỉ lưu mã trong trình duyệt, không lưu dữ liệu cá nhân/đề/đáp án ở localStorage.

## Rà soát giai đoạn 9

Giữ thiết kế hiện có; bổ sung Tag Chạy thử cho bảng đợt desktop (card mobile đã có). Đã QA riêng dữ liệu E2E ở desktop khoảng 1512px, tablet768 và mobile412: màn làm bài, nhãn thử, chọn A/→, tự lưu, nhóm bên phải/xuống dưới. Chưa hoàn tất toàn bộ ma trận viewport/light-dark/ADMIN/Modal/màn thấp; không coi unit/API test là thay kiểm tra trực quan. Chi tiết và kết quả mới nhất: [STAGE9_REVIEW.md](STAGE9_REVIEW.md).

## Giai đoạn 10

Trạng thái hiện tại: QR chuyển sang ADMIN; USER có xác nhận trước start, trạng thái riêng và tiếp tục lượt đang làm. Admin thêm tổng hợp đảng bộ, lịch sử/chi tiết snapshot chỉ đọc, dùng FormModal/Table/card và token hiện có. Kiểm tra thực tế và khoảng trống viewport/theme được ghi riêng tại [STAGE10_REVIEW.md](STAGE10_REVIEW.md); các mục QR USER phía trên là lịch sử phiên trước, không còn là hành vi hiện tại.

## Cơ cấu đề — giai đoạn 11

Thay tab Chia đề bằng Cơ cấu đề; tái sử dụng Radio/Form/InputNumber, Table >=1200px/card dọc dưới 1200px, nhãn nhóm mới, lỗi đỏ theo dòng, nút thứ tự, tổng và FormModal xem mẫu. Form sửa đợt bỏ ô số câu. Cơ cấu bị khóa bởi lượt chính thức, chỉ hiện một câu giải thích và form chỉ đọc. Không có giao diện bộ đề tạo trước.

Rà soát code giữ pattern/token hiện có; không dùng browser theo chỉ đạo người dùng trước đó. Desktop/tablet/mobile, light/dark và màn thấp chưa xác minh bằng mắt cho bản này, không coi lint/build là PASS hình ảnh. Chi tiết test ở STAGE11_REVIEW.md.

## Làm bài — giai đoạn 12

Giữ component/token hiện có, toolbar sticky có vùng thông báo cố định, icon đồng bộ cạnh timer, link Bỏ chọn/nút chính Câu sau. Điện thoại navigation fixed bottom + safe area, Drawer danh sách câu. Submit chờ trong FormModal rồi chuyển replace thẳng kết quả. Đã rà soát code responsive/wrap; người dùng tự xác minh hình ảnh/theming/Slow 3G theo chính sách hiện hành. Lần QA browser trước khi đổi rule chỉ quan sát được chọn liên tục trên 3G, mobile 390px, auto-next; chưa hoàn tất nộp/F5/end-to-end. Không tiếp tục mở browser sau chỉ đạo mới.

## Cảnh báo rời trang làm bài

Tái sử dụng FormModal, Button và Space hiện có, không thêm CSS/token. Khi lượt IN_PROGRESS, điều hướng nội bộ có “Ở lại làm bài” / “Rời trang”, nhắc thời gian tiếp tục tính; F5/đóng tab dùng cảnh báo trình duyệt. Đã kiểm code, unit/lint/build; desktop/tablet/mobile và hành vi Back/F5/chuyển kết quả cần người dùng kiểm thủ công, chưa kiểm bằng browser.

## Giai đoạn 13: hướng dẫn dự thi

Trang /guide công khai, Admin /admin/guide dùng Card/Space/Button/Input và typography hiện có, không có hệ token mới. QR SVG origin thực, hướng dẫn và đầu mối từ cấu hình do Admin lưu; CSS print A4 15mm, nền trắng, ẩn nút. Rà soát code có co chiều rộng, bẻ URL và QR 160px; browser, dark mode, desktop/tablet/mobile và bản in A4/scan QR chưa kiểm theo chính sách người dùng tự kiểm UI.
