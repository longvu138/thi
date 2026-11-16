# Frontend

> Chính sách kiểm tra hiện hành: xem `AI_RULES.md` ở root repository. AI không mở browser/test UI, không tự tạo DB hoặc đổi DB_NAME; dùng DB dev hiện có cho kiểm tra an toàn. Các lệnh integration dựng/xóa schema dưới đây là tài liệu suite cũ, không chạy trên DB dev; người dùng tự kiểm UI.


React 19 + Vite, Ant Design 6, Tailwind 4, Axios và TanStack React Query (JavaScript/JSX). Yêu cầu nghiệp vụ: [../docs/PLAN.md](../docs/PLAN.md).

Hiện có: đăng nhập, khung ứng dụng desktop/mobile, trang chủ tạm `/home`, quản lý tài khoản ADMIN `/admin/users`. Đã có tab Câu hỏi ADMIN trong chi tiết đợt `/admin/exam-rounds/:id`, quản lý/xem đợt kiểm tra và luồng làm bài USER. Đã có kết quả chi tiết và lịch sử cá nhân ở giai đoạn 6; đã có báo cáo quản trị theo đợt ở giai đoạn 7.

## Phát triển

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Frontend: http://localhost:3110. Backend mặc định: http://localhost:3108/api; đổi bằng `VITE_API_BASE_URL` trong `.env`. Dữ liệu lấy từ backend, không có dữ liệu mẫu.

## Kiểm tra và build

```bash
pnpm lint
pnpm test    # unit test node:test cho hàm thuần (src/**/*.test.js)
pnpm build
```

Không dùng E2E/Playwright. Người dùng tự đối chiếu desktop/tablet/mobile theo checklist UI trong `AI_RULES.md`; AI không mở browser.

Output build nằm trong `dist/`. `pnpm preview` phục vụ bản build tại http://localhost:4174. Khi triển khai, web server đưa `/api` tới backend và route frontend về `index.html`.

## Cấu trúc

`src/app` điều phối/route/menu, `pages` màn hình, `components` và `layouts` giao diện chung, `hooks` React Query, `api` HTTP client, `constants`, `utils` tiện ích, `styles` token/CSS dùng chung.

## Khung ứng dụng

- `app/App.jsx` chỉ cấp provider/theme (light/dark); phiên đăng nhập (khởi tạo `/auth/me` một lần, đăng nhập/đăng xuất) nằm ở `hooks/useAuthSession.js`. Cache React Query bị `queryClient.clear()` khi đăng xuất, khi phiên bị xóa (401) và trước khi gán người dùng mới. Error Boundary bọc ngoài cùng trong `main.jsx` và trong ConfigProvider.
- `api/httpClient.js` gửi cookie (`withCredentials`), tự lưu `csrfToken` từ response và gắn header `X-CSRF-Token` cho request ghi; 401 xóa phiên và chuyển về `/login`; 403 phát sự kiện `api-forbidden` để hiển thị thông báo.
- `app/navigation.js` là nguồn duy nhất cho menu (sidebar, thanh dưới mobile), điều kiện vào route theo vai trò (`roles: ["ADMIN"]`…) và tiêu đề tab (`<Trang> · Kiểm tra nhận thức`). Menu chỉ để hiển thị; phân quyền thật ở backend. Biểu tượng menu ở `components/layout/navIcons.jsx`. Nhãn vai trò ở `constants/roles.js`.
- Layout chọn cây desktop/mobile bằng `hooks/useMediaQuery.js` (breakpoint 768px). Nút "Làm mới dữ liệu" trên mobile refetch các query đang hiển thị.
- `QueryErrorState` hiển thị lỗi tải dữ liệu kèm "Mã tra cứu" (`X-Request-Id`). Thông báo thao tác dùng `hooks/useFeedback.js`.
- Quy tắc mật khẩu dùng cho form tài khoản: `constants/password.js` + `utils/passwordPolicy.js` (đồng bộ `backend/src/utils/password-policy.js`).
- Vùng chạm ≥ 40–44px cho tablet/mobile (`max-width: 1024px` hoặc `pointer: coarse`) trong `styles/dashboard-and-mobile.css`.
- Không dùng service worker/PWA; `main.jsx` gỡ service worker và cache cũ còn sót trên cùng origin.
- Không lưu nội dung đề hoặc đáp án đúng vào trình duyệt. Chỉ lựa chọn/timestamp/deadline/vị trí câu được lưu sessionStorage theo giai đoạn 12; không lưu bài làm trong localStorage.

## Quản lý tài khoản

`pages/users/UsersPage.jsx` dùng `hooks/useUsers.js` và `api/usersApi.js`; chuẩn hóa dữ liệu/payload trong `utils/users.js`. ADMIN có tìm kiếm, phân trang, thêm/sửa, đặt lại mật khẩu, khóa/mở khóa và xóa mềm. Desktop từ 1200px dùng Table; dưới 1200px dùng card dọc. Form nằm trong Modal với footer thao tác. Menu và route chỉ cho ADMIN, backend kiểm tra quyền độc lập.

## Câu hỏi theo đợt (giai đoạn 8)

Tab Câu hỏi ở route ADMIN `/admin/exam-rounds/:id` dùng `components/questions/RoundQuestions.jsx`, `components/questions/`, `hooks/useQuestions.js`, `api/questionsApi.js`; normalize/payload/điều kiện xác nhận trong `utils/questions.js`. Dùng Table từ 1200px, card dọc dưới 1200px, Modal cho form và import. Có tìm mã/nội dung, lọc nhóm (tìm nhóm và phân trang khi quá 100 nhóm), thêm/sửa/xóa hẳn câu chưa dùng hoặc vô hiệu hóa câu đã vào đề và cờ xáo trộn.

Luồng import: tải mẫu → điền sheet đầu tiên → chọn file → Xem trước → rà soát từng dòng → Xác nhận import và xác nhận hộp thoại. Có lỗi thì sửa file và chọn lại. Chọn/xóa file làm mất preview cũ. File và preview chỉ giữ trong bộ nhớ của màn hình, không đưa vào localStorage. Khi lỗi commit hoặc token hết hạn, xem trước lại.

Trang quản lý tài khoản có Tải Excel mẫu và Import Excel với Modal xem trước/xác nhận (`components/users/UserImportModal.jsx`). File mẫu hướng dẫn cột ten_dang_nhap/ho_ten/mat_khau, vai_tro/hoat_dong tùy chọn. Mật khẩu tối thiểu 6 ký tự; không giới hạn 72 byte hoặc cấm chứa tên tài khoản. Không hiển thị mật khẩu trong preview. Chọn file khác hoặc đóng Modal sẽ xóa file/preview khỏi trạng thái màn hình.

Mẫu Excel câu hỏi dùng cột `ma_cau_hoi`, `nhom_cau_hoi`, `noi_dung`, `lua_chon_a`, `lua_chon_b`, `lua_chon_c`, `lua_chon_d`, `dap_an_dung`, `cho_phep_xao_tron` (tùy chọn). Backend ánh xạ về trường nội bộ và vẫn hỗ trợ mẫu cũ.

## Đợt kiểm tra

`/admin/exam-rounds` và `/admin/exam-rounds/:id` dành cho ADMIN; `/exam-rounds` và `/exam-rounds/:id` là màn xem danh sách/chi tiết OPEN/CLOSED. Module gồm `pages/exam-rounds`, `components/exam-rounds`, `api/examRoundsApi.js`, `hooks/useExamRounds.js`, `constants/examRounds.js`, `utils/examRounds.js`.

Giữ pattern Table từ 1200px, card dọc dưới 1200px, Modal form có footer cố định và body cuộn. Form không chọn nhóm; nhóm là thuộc tính văn bản của câu trong tab Câu hỏi. Các mốc hiển thị/nhập theo Asia/Ho_Chi_Minh, payload đổi về UTC bằng dayjs utc/timezone; desktop dùng DatePicker, tablet/mobile dùng Input datetime-local để lịch chọn không tràn viewport. Có nhãn chưa đến thời gian/hết thời gian độc lập trạng thái OPEN. Menu/route quản trị theo vai trò, backend kiểm tra quyền độc lập. Có nút Bắt đầu / Tiếp tục cho người dự thi.

Các form quản trị và import dùng chung `components/common/FormModal.jsx`: modal giữa màn hình, giới hạn chiều cao theo viewport, header/footer cố định và body cuộn. Form hai cột trên tablet/desktop, một cột dưới 768px; đợt kiểm tra dùng bốn cột thông số từ 1000px để giảm cuộn. Bảng danh sách vẫn giữ Table/card theo breakpoint cũ.

## Trang vào thi và đăng nhập quản trị

`pages/auth/LoginPage.jsx` là form họ tên/đảng bộ/chi bộ tự nhập tại `/login`, gọi `/auth/enter` và chuyển USER tới `/exam-rounds`. `pages/auth/AdminLoginPage.jsx` giữ form tài khoản/mật khẩu tại `/admin/login`. Khi đổi người/đăng xuất vẫn xóa cache React Query. Sai thông tin đăng nhập không tự chuyển trang; khi phiên hết hạn trên route quản trị thì đưa về `/admin/login`, các route khác về `/login`. Quản lý tài khoản hiển thị đảng bộ/chi bộ của người dự thi, ẩn username kỹ thuật và trường mật khẩu/chuyển vai trò cho loại người dùng này.

## Nhận diện Trắc Nghiệm Trực Tuyến

Tên dùng chung tại `constants/app.js`; favicon/biểu trưng chữ VPTW ở `public/favicon.svg`. Trang vào thi dùng `pages/auth/participant-entry.css`: header đỏ–vàng (không có nút đăng nhập quản trị; truy cập trực tiếp `/admin/login`), nền kem, giới thiệu/form hai cột và một cột dưới 768px, có light/dark. Phân tích nguồn tham khảo và giới hạn phạm vi trong `../docs/UI_REFERENCE.md`. Không lấy số liệu cố định hoặc backend Supabase từ mẫu.

Giai đoạn 4 chỉ bổ sung `trialStartAt` vào cấu hình/chi tiết đợt và nhãn Chạy thử theo thời gian hiện tại; thời gian vẫn chuyển UTC. Đã có màn làm bài ở giai đoạn 5; trang kết quả chi tiết thuộc giai đoạn 6.

## Làm bài — giai đoạn 12

USER chọn đợt và xác nhận bắt đầu/tiếp tục như trước. Route `/attempts/:id` giữ nhận diện hiện có, đồng hồ và thông báo ở thanh trên cùng. Chọn đáp án phản hồi tại máy ngay; giữ lựa chọn ở RAM và `sessionStorage` theo mã lượt, chỉ map ID câu → A/B/C/D/null, thời điểm sửa và deadline. Vị trí câu dùng khóa riêng. Không lưu nội dung câu/đáp án đúng, không dùng localStorage cho dữ liệu bài làm.

Mở lại trang tải Backend, hợp nhất bản local mới hơn dựa trên answerUpdatedAt; chỉ lựa chọn khác Backend vào hàng đợi. Xóa cache khi nộp/chốt/quá hạn/đăng xuất. Request lô mỗi 30 giây chỉ gửi phần thay đổi, tối đa 500 câu/lô; khi ẩn trang dùng fetch keepalive. Request cũ không xóa revision mới; lỗi để nhịp sau gửi bù, không chèn lỗi giữa màn. Timeout lưu 30 giây, nộp 60 giây; tải đề/kết quả 30 giây riêng, không đổi timeout chung.

Nộp gửi toàn bộ đáp án trong một request, không chờ lô lưu. Có màn “Đang nộp bài…”, retry mạng tối đa 3 lần (giãn 1/2 giây), sau đó nút Nộp lại. 409 đọc lại trạng thái server, chỉ chuyển kết quả khi xác minh đã chốt. Nộp hoặc tự chốt xong navigate replace thẳng `/attempts/:id/result`; hiển thị thời điểm nộp hoặc tự chốt và cảnh báo số lựa chọn chưa ghi nhận. Không có thẻ trung gian “Đã ghi nhận bài nộp”. Modal xác nhận liệt kê các câu chưa trả lời, bấm số để quay lại.

Trạng thái chỉ là icon cạnh đồng hồ (Đã lưu/Chưa đồng bộ – sẽ gửi khi nộp), nhắc 10/5 phút ở vị trí cố định, từ 5 phút giữ dòng nhắc; chỉ chỉnh đồng hồ khi lệch server >2 giây. Điện thoại có navigation cố định đáy, danh sách câu trong Drawer; Câu sau chính bên phải, Bỏ chọn dạng link nhỏ. Tự sang câu sau mặc định bật khi bắt đầu trên điện thoại; chỉ preference này được lưu localStorage, không phải dữ liệu bài. F5 giữ vị trí ở sessionStorage. Giữ shortcut desktop ←/→, A/B/C/D và chặn khi gõ/đang mở dialog.

Source: `utils/attemptSession.js`, `attemptStorage.js`, `attemptBatch.js`, `attempts.js`, `hooks/useAttempts.js`, API attempts/results, màn làm bài/kết quả và components attempts. Unit/lint/build theo chính sách hiện hành; người dùng tự thử UI/Slow 3G trên DB dev, không cần dựng DB/QA mới. Kịch bản và phần chưa kiểm: [STAGE12_REVIEW](../docs/STAGE12_REVIEW.md).

## Kết quả cá nhân (giai đoạn 6)

USER mở menu **Kết quả cá nhân** (`/my-results`; trên mobile nằm trong **Tài khoản**) để xem trạng thái cuối từng đợt và số lượt chính thức đã dùng. Bấm **Xem lịch sử** để mở lịch sử phân trang của đợt, gồm lượt chạy thử có nhãn riêng. Lượt đang làm có nút **Tiếp tục**; lượt kết thúc có **Xem kết quả** (`/attempts/:id/result`). Màn xác nhận nộp bài cũng có nút Xem kết quả.

Kết quả hiển thị số đúng/sai/chưa trả lời, tỷ lệ, Đạt/Không đạt, ngưỡng, thời lượng, thời gian Việt Nam và chi tiết đề/đáp án đã chọn từ snapshot. Đáp án đúng chỉ nhận từ API kết quả khi snapshot cho phép và lượt đã kết thúc; không suy diễn đáp án đúng khi bị ẩn. API 409 ở lượt đang làm hiển thị đường dẫn tiếp tục. ADMIN không có menu/quyền vào các màn USER này.

Source: `pages/results`, `api/resultsApi.js`, `hooks/useResults.js`, `utils/results.js`; dùng layout/Card/Tag/Descriptions và pattern Table từ 1200px, card dọc dưới 1200px. Phần thống kê kết quả một cột dưới 1200px để tránh ép chữ khi còn sidebar. Không ghi dữ liệu kết quả/đề vào localStorage. Unit test chuẩn hóa, ẩn đáp án, null và menu/phân quyền trong `results.test.js`, `navigation.test.js`.

Chạy `pnpm dev`, mở http://localhost:3110, vào bằng thông tin USER đã thi, mở Kết quả cá nhân → Xem lịch sử → Xem kết quả; hoặc nộp một lượt trên database phát triển rồi bấm Xem kết quả. Không thử trên dữ liệu thật. Kết quả cuối là giá trị server tính theo tình trạng đợt hiện tại; điểm và đề từng lượt giữ snapshot. Chưa triển khai dashboard/báo cáo quản trị/xuất Excel.

## Khung cổng người dự thi

`layouts/ParticipantLayout.jsx` được `AppLayout` chọn cho USER qua `participantLayoutRules.js`; ADMIN tiếp tục dùng DesktopAppLayout/MobileAppLayout. USER dùng cùng nhận diện với trang nhập thông tin: header đỏ–vàng, biểu trưng VPTW, nền kem, nội dung giữa màn hình rộng tối đa 1240px, không có sidebar hoặc thanh dưới của khu quản trị. Điều hướng **Đợt kiểm tra / Kết quả của tôi** nằm trên nội dung ở cả desktop/mobile. Nút Đổi người dự thi sử dụng logout hiện có.

Khi ở URL làm bài, ẩn liên kết điều hướng/đổi người để hạn chế rời bài nhầm. Đồng hồ và nút Nộp giữ sticky, đáp án là thẻ A/B/C/D có trạng thái chọn/focus, bảng câu có thông tin người thi và thanh tiến độ trên desktop, chuyển xuống dưới trên tablet/mobile. CSS chỉ scope trong `.participant-session`, tái sử dụng token/nhận diện từ `pages/auth/participant-entry.css`. API, hàng đợi tự lưu, snapshot, chấm điểm và quyền sở hữu không thay đổi. Không dùng cơ chế localStorage của source tham khảo.

Kiểm tra: `pnpm test` (có test chọn layout theo vai trò và nhận diện route làm bài), `pnpm lint`, `pnpm build`. Đã xem Chrome ở desktop khoảng 1512px, vùng tablet 815px, mobile giả lập 412px; kiểm tra bắt đầu/tiếp tục, chọn đáp án, tự lưu và tiến độ. Đã sửa và xem lại tràn bề rộng mobile. Chưa đối chiếu đủ dark mode, màn thấp, mốc chính xác 1440/1024/768/390 hoặc toàn bộ màn ADMIN bằng mắt; logic chọn khung ADMIN có unit test. Dùng database E2E riêng, không sửa dữ liệu thật.


## Báo cáo quản trị theo đợt (giai đoạn 7)

ADMIN vào `/admin/exam-rounds`, bấm **Báo cáo** hoặc mở chi tiết → **Kết quả và báo cáo**. Route `/admin/exam-rounds/:id/reports` chỉ cho ADMIN, dùng layout quản trị hiện có. Module: `pages/reports/RoundReportPage.jsx`, `components/reports/ReportTables.jsx`, `hooks/useReports.js`, `api/reportsApi.js`, `utils/reports.js`.

Dashboard có số người tham gia, người Đạt/Không đạt/chưa hoàn thành, tỷ lệ Đạt, tổng lượt và lượt trung bình/người. Bảng chi tiết có đủ họ tên, đảng bộ, chi bộ, đợt, lượt dùng/tối đa, tỷ lệ đúng cao nhất của lượt đã chốt, kết quả cuối và thời gian gần nhất (giờ Việt Nam). Mỗi người một hàng, không đếm số lượt thành số người. Từ 1200px dùng Table cuộn ngang bên trong khi nhiều cột; tablet/mobile dùng card dọc.

Nút **Bộ lọc** mở FormModal dùng chung (header/footer cố định, body cuộn): tìm họ tên/đơn vị, đảng bộ, chi bộ, kết quả cuối và loại dữ liệu Chính thức/Chạy thử. Nhấn Áp dụng để cập nhật; nhãn phía trên ghi bộ lọc đang áp dụng. Dashboard, bảng, tab Theo câu hỏi và Excel dùng cùng bộ lọc đó. Xuất Excel lấy tất cả hàng phù hợp, không chỉ trang đang xem; file có bốn sheet Tổng hợp, Chi tiết, Theo câu hỏi, Theo đảng bộ. Tab câu hỏi có tỷ lệ đúng tăng/giảm và số lượt gặp; lựa chọn A/B/C/D là khóa gốc trước đảo đáp án. Chỉ tính câu trong các lượt đã chốt. Nếu một câu có nhiều phiên bản, hiển thị một nội dung snapshot đại diện và cộng mọi lượt theo question_id.

Chọn Chạy thử rồi Áp dụng sẽ hiển thị riêng dữ liệu thử và nút **Xóa dữ liệu chạy thử**. Xác nhận này xóa toàn bộ lượt thử của đợt, không chỉ các hàng đang lọc; API có sẵn từ giai đoạn 4, cần ADMIN/CSRF/confirm=true. Không xóa lượt chính thức. Việc xuất và xóa có audit log backend. USER không có nút/route hoặc quyền gọi API báo cáo.

Chạy `pnpm dev`, mở http://localhost:3110/admin/login → Đợt kiểm tra → Báo cáo trên database phát triển có dữ liệu test do bạn chuẩn bị. Thử lọc, đổi trang, tab câu hỏi, xuất Excel rồi so sánh dashboard/hàng/file. Không chạy thao tác thử trên dữ liệu thật. Unit test chuẩn hóa báo cáo, bộ lọc và tiêu đề route được chạy cùng `pnpm test`; lint/build theo hướng dẫn chung. Kiểm thử API/Excel dùng database reports riêng theo README backend. Không bổ sung Docker/VPS hoặc thử tải giai đoạn 9.


Giai đoạn 8: tạo Nháp chưa cần câu hỏi → mở chi tiết → tab Câu hỏi → thêm/import → mở đợt khi đủ câu hợp lệ. Form đợt không còn chọn nhóm. Tab có số câu hợp lệ/số câu mỗi bài và Xuất Excel theo định dạng mẫu; xuất mọi câu đang hoạt động để nhập vào đợt khác. API và query key câu hỏi/nhóm chứa roundId để cách ly cache. Không còn menu hoặc route `/admin/questions`; USER không có tab quản lý. Giữ Table/card theo breakpoint 1200px và FormModal hiện hữu. Không đổi lượt thi/chấm/kết quả/báo cáo.

## Đợt kiểm tra và mã QR phía Admin

Danh sách USER hiển thị đợt mở/đóng theo API, ưu tiên lượt đang làm, đợt đang thi/chạy thử rồi đợt tương lai và đã kết thúc. Mỗi thẻ có lượt chính thức đã dùng/tối đa/còn lại, kết quả cuối và lý do khóa nút. Bắt đầu lượt mới mở hộp xác nhận đầy đủ cấu hình và danh tính; chỉ gọi start khi xác nhận. Có lượt đang làm thì **Tiếp tục làm bài** vào thẳng lượt đó. USER không có nút QR. ADMIN đăng nhập vào `/admin/exam-rounds`, có QR ở danh sách và chi tiết; `RoundQrModal` dùng QRCode Ant Design, hỗ trợ tải PNG và in, không gửi dữ liệu sang dịch vụ QR ngoài.

QR chỉ chứa `/login?continue=/exam-rounds/<uuid>` trên website đã chọn, không chứa danh tính/cookie/đáp án. Điện thoại chưa có phiên nhập thông tin rồi được đưa đến đúng đợt; đã đăng nhập USER thì mở chi tiết ngay. Chỉ cho trở lại đường dẫn UUID lượt thi hoặc đợt hợp lệ, không nhận URL ngoài/route ADMIN. Không tự bắt đầu hoặc chuyển lượt đang làm từ máy khác.

Mặc định địa chỉ QR theo `VITE_PUBLIC_APP_URL` nếu đặt, hoặc origin hiện tại. Trong modal có thể đổi sang tên miền/IP mạng nội bộ. Localhost trên điện thoại là chính điện thoại nên không dùng để truy cập máy tính. Với dev LAN: mở website qua `http://<IP_MAY_TINH>:3110`, đặt `VITE_API_BASE_URL=http://<IP_MAY_TINH>:3108/api`, thêm origin frontend đó vào `CORS_ALLOWED_ORIGINS` backend, rồi khởi động lại tiến trình đã đổi biến. Hai thiết bị cùng mạng và cổng phải truy cập được. Không dùng URL tunnel hoặc công khai server tự động. QR không làm thay đổi quy tắc thời gian/quyền/lượt thi tại backend.

## Phiếu kết quả có mã tra cứu

Sau khi nộp hoặc hết giờ, trang kết quả hiển thị mã phiếu và nút **Phiếu kết quả / In phiếu**. Trang `/attempts/:id/receipt` (USER sở hữu) xem bản A4, chọn **In phiếu / Lưu PDF** để mở hộp thoại in trình duyệt. Phiếu theo mẫu cung cấp: tên đơn vị từ đảng bộ/chi bộ người dự thi, tiêu đề theo tên đợt, ngày theo giờ Việt Nam; để trống địa danh, phần xác nhận chi ủy dành ký tay. Không có chữ ký số/xác nhận của cơ quan được tạo tự động. Đạt/Không đạt và số liệu lấy từ snapshot backend, không tính/chấm lại ở trình duyệt.

Trang công khai `/receipts`, liên kết **Tra cứu / In lại phiếu kết quả bằng mã** ở trang vào thi, cho nhập mã khi đã hết phiên. Không đưa mã vào URL; nhập mã rồi bấm Tra cứu. Trình duyệt chỉ nhớ tối đa 10 mã (không nhớ tên/điểm/đề/đáp án), có nút xóa mã đã lưu trên máy; mã hiển thị để sao chép/lưu riêng và ai có mã có thể xem phiếu. Nếu đổi thiết bị/xóa dữ liệu trình duyệt thì cần nhập mã đã lưu; vẫn có thể nhập lại thông tin người dự thi để vào lịch sử và mở phiếu.

Các file: `pages/receipts/ReceiptPage.jsx`, `components/receipts/ReceiptSheet.jsx`/`receipt.css`, `hooks/useReceipts.js`, `api/receiptsApi.js`, `utils/receipts.js`. Bản in dùng portal riêng và @media print, chỉ in phiếu, ẩn toàn bộ navigation/form/toolbar. Có thể lưu PDF bằng hộp thoại in; không gửi phiếu sang dịch vụ ngoài. Kiểm tra mã cache lỗi/trùng/giới hạn, múi giờ với `pnpm test`; lint/build như thông thường.

## Rà soát giai đoạn 9

Giữ luồng/UI hiện có. Đã bổ sung tự thử lưu lại khi API tạm lỗi nhưng navigator.onLine vẫn true, giãn cách 1/2/4… tối đa 30 giây; pending chỉ ở RAM, 422/403 không tự thử, nút lưu lại vẫn dùng được. Nộp tự thử tối đa 3 lần, chờ 1 và 2 giây, hết thử hiện Nộp lại. Bảng đợt desktop ADMIN/USER hiện thêm nhãn Chạy thử như card mobile. Nhóm câu, mốc 10/5 phút, phím tắt, đối chiếu lựa chọn và hàng đợi có unit test. Xem phạm vi UI đã/không kiểm trong `../docs/STAGE9_REVIEW.md`.

## Giai đoạn 10: quản trị và báo cáo

Danh sách Admin có số câu hợp lệ/số câu mỗi bài, đánh dấu thiếu câu, Mở đợt/Đóng đợt có xác nhận; Backend vẫn quyết định đủ câu và ghi audit. Báo cáo thêm tab **Theo đảng bộ**: gộp NFC/khoảng trắng/hoa-thường, giữ phân biệt dấu; bấm dòng lọc chính xác bảng người và Excel theo cùng loại Chính thức/Chạy thử. Từ bảng người, **Xem các lượt** mở lịch sử mọi lượt và chi tiết snapshot chỉ đọc, gồm đáp án đúng dành riêng Admin.

Kiểm thử: `pnpm lint`, `pnpm test`, `pnpm build`. Cách thử và giới hạn kiểm tra trực quan: [STAGE10_REVIEW](../docs/STAGE10_REVIEW.md).

## Cơ cấu đề — giai đoạn 11

ADMIN → Chi tiết đợt → tab **Cơ cấu đề**. Chọn **Lấy ngẫu nhiên toàn bộ** và nhập Số câu mỗi đề, hoặc **Lấy theo từng nghị quyết**. Bảng tự liệt kê nhóm, câu hợp lệ, Lấy mỗi đề và nút lên/xuống; mặc định tên có số sắp xếp tự nhiên (2 trước 10). Nhóm vừa import sau khi lưu được làm nổi “Nhóm mới”, mặc định lấy 0. Ô “Mỗi nghị quyết lấy [k] câu” + Áp dụng cho tất cả điền nhanh, có thể sửa từng dòng. Lỗi đỏ theo dòng; tổng số câu hiển thị ngay. Không cho lưu khi thiếu câu/tổng 0.

**Xem thử 1 đề mẫu** dùng cấu hình đang nhập, mở FormModal có đáp án đúng, không lưu cơ cấu/lượt thi. **Lưu** tính lại số câu ở Backend. Form tạo/sửa đợt bỏ ô số câu; thông tin đợt và cột câu hợp lệ/số câu mỗi bài nhận giá trị tính từ API. Backend đánh dấu thiếu từng nhóm dù tổng ngân hàng còn đủ.

Đã có lượt chính thức: hiện “Đợt đã có người thi, không thay đổi được cơ cấu đề”, form chỉ đọc và không lưu. Lượt thử không khóa. Không còn tab/API/chức năng tạo trước bộ đề, tạo/xóa/xem bộ đề hoặc ba chế độ cũ.

File: `components/exam-rounds/RoundStructure.jsx`, `api/structureApi.js`, `hooks/useStructure.js`, `utils/structure.js` cùng unit test; GET cơ cấu được làm mới sau thêm/import/sửa/xóa câu. Dùng lại Table từ 1200px, card dưới 1200px, FormModal, Radio/InputNumber và token hiện có. pnpm lint/test/build; phần đối chiếu viewport/theme đã/chưa kiểm ghi tại [STAGE11_REVIEW](../docs/STAGE11_REVIEW.md). Không dùng E2E/Playwright.

## Bảo vệ lựa chọn và cảnh báo rời bài

Trong phiên làm bài đang mở, phản hồi tải lại đề không ghi đè lựa chọn người dùng vừa sửa, kể cả lô lưu đã được xác nhận. Khi Backend chốt lượt, kết quả Backend là nguồn chính; khôi phục ban đầu từ sessionStorage vẫn dùng quy tắc timestamp hiện có.

Router dùng `createBrowserRouter` với cây route hiện hữu để hỗ trợ `useBlocker`: Link/menu/Back khi đang làm mở FormModal xác nhận; F5, đóng tab hoặc chuyển sang website khác dùng cảnh báo `beforeunload` mặc định của trình duyệt. Thời gian vẫn chạy khi rời trang. Sau khi nộp/hết giờ đã được Backend xác nhận, không cảnh báo. Cảnh báo đóng tab phụ thuộc trình duyệt và không bảo đảm xuất hiện khi hệ điều hành đóng ứng dụng.

Tự thử: chọn A, đổi B khi mạng chậm, chờ tải lại đề và nộp — B phải giữ nguyên; thử Back/link rồi chọn “Ở lại làm bài”; thử “Rời trang” rồi quay lại; thử F5/đóng tab; nộp thành công phải sang kết quả không bị hộp xác nhận rời bài. AI chỉ chạy unit/lint/build, không kiểm UI theo chính sách hiện hành.

## Hướng dẫn dự thi (giai đoạn 13)

`/guide` công khai, in A4 với QR cổng `/login`; link tại trang vào thi. Admin mở `/admin/guide` từ menu để lưu đầu mối hỗ trợ (tối đa 1000 ký tự), dùng API qua `guideApi`/`useGuide`. Giữ Card/Space/Form và token hiện có. Nội dung lưu tại volume cấu hình Backend, không lưu secret vào frontend. Chưa kiểm browser/print thật; người dùng tự kiểm desktop/tablet/mobile, in A4 và QR qua địa chỉ IP/domain thực.
