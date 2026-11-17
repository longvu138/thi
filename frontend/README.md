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
- `api/httpClient.js` gửi cookie (`withCredentials`), tự lưu `csrfToken` từ response và gắn header `X-CSRF-Token` cho request ghi; 401 xóa phiên và chuyển về `/`; 403 phát sự kiện `api-forbidden` để hiển thị thông báo.
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

`pages/auth/LoginPage.jsx` là form họ tên/đảng bộ/chi bộ tự nhập tại `/`, gọi `/auth/enter` và vào thẳng `/attempts/:id` khi có một đợt khả dụng. `pages/auth/AdminLoginPage.jsx` giữ form tài khoản/mật khẩu tại `/admin/login`. Khi đổi người/đăng xuất vẫn xóa cache React Query. Sai thông tin đăng nhập không tự chuyển trang; khi phiên hết hạn trên route quản trị thì đưa về `/admin/login`, các route khác về `/`. Quản lý tài khoản hiển thị đảng bộ/chi bộ của người dự thi, ẩn username kỹ thuật và trường mật khẩu/chuyển vai trò cho loại người dùng này.

## Nhận diện Trắc Nghiệm Trực Tuyến

Tên dùng chung tại `constants/app.js`; đã bỏ logo và favicon, chỉ hiển thị tên bằng chữ. Trang vào thi dùng `pages/auth/participant-entry.css`: header đỏ–vàng (không có nút đăng nhập quản trị; truy cập trực tiếp `/admin/login`), nền kem, giới thiệu/form hai cột và một cột dưới 768px, có light/dark. Phân tích nguồn tham khảo và giới hạn phạm vi trong `../docs/UI_REFERENCE.md`. Không lấy số liệu cố định hoặc backend Supabase từ mẫu.

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

`layouts/ParticipantLayout.jsx` được `AppLayout` chọn cho USER qua `participantLayoutRules.js`; ADMIN tiếp tục dùng DesktopAppLayout/MobileAppLayout. USER dùng cùng nhận diện với trang nhập thông tin: header đỏ–vàng, tên hệ thống bằng chữ, nền kem, nội dung giữa màn hình rộng tối đa 1240px, không có sidebar hoặc thanh dưới của khu quản trị. Điều hướng **Đợt kiểm tra / Kết quả của tôi** nằm trên nội dung ở cả desktop/mobile. Nút Đổi người dự thi sử dụng logout hiện có.

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

QR chỉ chứa `/?continue=/exam-rounds/<uuid>` trên website đã chọn, không chứa danh tính/cookie/đáp án. Điện thoại chưa có phiên nhập thông tin rồi được đưa đến đúng đợt; đã đăng nhập USER thì mở chi tiết ngay. Chỉ cho trở lại đường dẫn UUID lượt thi hoặc đợt hợp lệ, không nhận URL ngoài/route ADMIN. Không tự bắt đầu hoặc chuyển lượt đang làm từ máy khác.

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

## Trang hướng dẫn đã bỏ

Theo yêu cầu đơn giản hóa, bỏ trang `/guide`, `/admin/guide`, menu Cài đặt chung và liên kết In hướng dẫn trên cổng vào. Xóa component/CSS/hook/API client frontend không còn dùng. Không thay đổi API Backend hay dữ liệu cấu hình hỗ trợ đã lưu. Menu Admin hiện chỉ Đợt kiểm tra / Tài khoản.

### Vào thẳng đợt duy nhất

Cổng dự thi: sau khi điền thông tin và bấm **Vào thi**, nếu chỉ có một đợt khả dụng thì bắt đầu bài ngay (hoặc tiếp tục lượt đang làm). Backend vẫn kiểm tra thời gian, giới hạn lượt và điều kiện bắt đầu. Đợt đã chọn ở cổng vào được mở trực tiếp, không qua danh sách. Nếu chưa chọn và có nhiều đợt, giữ luồng danh sách hiện có. Nếu không thể bắt đầu hoặc API lỗi, hiện lý do tại form, không tự chuyển sang danh sách. Đặt `DIRECT_SINGLE_ROUND_ENTRY=false` trong `src/utils/participantEntry.js` để dùng lại luồng chọn đợt. Ở câu cuối, nút **Câu sau** đổi thành **Nộp bài**, vẫn mở hộp xác nhận nộp.

Tự thử: một đợt đang mở → nhập thông tin → Vào thi → câu hỏi; quay lại cùng thông tin phải tiếp tục lượt cũ. Kiểm tra thêm hết lượt, nhiều đợt và nút Nộp bài ở câu cuối trên mobile/desktop.

Cổng người thi chỉ dùng route `/`; đã bỏ route `/login`. QR website/đợt, đăng xuất và chuyển hướng hết phiên đều dùng `/`. Admin dùng `/admin/login`.

Màn kết quả `/attempts/:id/result`: ưu tiên Đạt/Không đạt, tỷ lệ và số câu đúng; chỉ giữ thống kê bổ sung sai/bỏ trống/thời gian. Mã tra cứu và In phiếu đặt cùng khối kết quả; câu trả lời nằm trong mục thu gọn “Xem lại câu trả lời”. Người dùng tự kiểm trên mobile/desktop, light/dark.

Kết quả: nút **Lưu / In phiếu** mở modal trên cùng trang, không tự in hoặc tải. Tải PDF tạo file A4 một trang, tự co theo kích thước phiếu và giữ tỷ lệ. PDF dùng ảnh độ phân giải 2x của phiếu để giữ tiếng Việt; không cần gửi dữ liệu sang dịch vụ ngoài. Không hiển thị số thứ tự/số lượt còn lại tại màn kết quả.

Mã xác nhận phiếu mới gồm 6 ký tự chữ in hoa/số (tránh ký tự dễ nhầm). Unique index và cơ chế sinh lại khi trùng vẫn giữ nguyên. Mã dài đã cấp vẫn tra cứu được, không đổi dữ liệu phiếu cũ, không cần migration.

### Admin in lại phiếu

Menu **Phiếu kết quả** tại `/admin/receipts`: danh sách có phân trang, tìm chính xác theo mã mới 6 ký tự hoặc mã cũ, xem/in lại và tải PDF cùng mẫu người thi. API ADMIN: `GET /api/admin/receipts?page=1&limit=20&code=AB3K7X`, `GET /api/admin/receipts/:attemptId`. Chỉ đọc snapshot phiếu đã lưu, không tạo/chấm lại lượt; có audit khi liệt kê/xem. Không có danh sách phiếu công khai cho USER. Không cần migration.

Tự thử: Admin → Phiếu kết quả → tìm mã → Xem / In phiếu → In phiếu hoặc Tải PDF; thử mã không tồn tại và mã sai. USER gọi hai API ADMIN phải 403, chưa đăng nhập 401. Danh sách chỉ có phiếu đã được cấp; lượt chưa kết thúc không có phiếu.

### Giai đoạn 15 — cửa sổ phiếu dùng chung

- `components/receipts/ReceiptModal.jsx`: dùng `FormModal`, `ReceiptSheet` và helper `receiptDownload`. Máy tính có In phiếu (chính)/Tải PDF; mobile có Lưu ảnh phiếu (chính)/Tải PDF. PNG hiện ngay trong modal để nhấn giữ lưu, có liên kết tải PNG nếu trình duyệt hỗ trợ download.
- Zalo/Facebook/Messenger được nhận biết bằng user agent: người thi không thấy In phiếu, có hướng dẫn mở Chrome/Safari; lỗi PDF gợi ý lưu ảnh. Đây là nhận biết theo UA, không bảo đảm mọi phiên bản ứng dụng đều giữ dấu nhận diện.
- Kết quả chỉ có một nút chính Lưu / In phiếu trong khối đầu, mã và giải thích một lần; thi tiếp ở card riêng khi Backend cho phép. Lịch sử/danh sách đợt là liên kết nhỏ; câu trả lời thu gọn.
- `/attempts/:id/receipt` (kể cả URL có `action=print|download` cũ) replace về `/attempts/:id/result`, mở modal, không tự in/tải. Đóng vẫn ở kết quả. Không sinh đường dẫn tự in/tải nữa.
- `/receipts`: bấm mã đã lưu tra cứu ngay qua API hiện có; tra cứu thành công mở cùng modal. Danh sách lượt trong Lịch sử cá nhân có nút Phiếu cho lượt đã chốt. Admin dùng cùng modal với In phiếu/Tải PDF.
- CSS in dùng trang A4 riêng `receipt-sheet-page`, `@page margin:0`, lề trong tờ phiếu, chỉ ẩn nội dung ứng dụng/modal khi đang mở phiếu (không ảnh hưởng in hướng dẫn/QR), co tờ phiếu dài để nằm trên một trang. Nội dung `ReceiptSheet`, mã, điểm, snapshot và API không thay đổi. PDF vẫn là ảnh 2x trong một trang A4; không gửi phiếu sang dịch vụ ngoài.

Chạy kiểm tra code: `cd frontend && pnpm test && pnpm lint && pnpm build`.

Tự thử sau `pnpm dev`:
1. Mở một kết quả: Lưu / In phiếu không đổi URL/không tự in; đóng giữ nguyên trang. Mã chỉ giải thích một lần.
2. Chrome máy tính: mở modal → In phiếu; xem trước đúng một trang A4 và không đầu/chân trang. Thử tên/đơn vị/tiêu đề dài và phiếu chạy thử. Tải PDF phải có đủ nội dung.
3. Android Chrome và iPhone Safari: Lưu ảnh phiếu → nhấn giữ lưu ảnh, thử thêm Tải ảnh PNG/Tải PDF. Kiểm tra sáng/tối, màn nhỏ và xoay ngang.
4. Zalo trên Android/iPhone, Facebook/Messenger: không có nút in cho người thi, có hướng dẫn Chrome/Safari, thử PDF và lựa chọn lưu ảnh khi lỗi.
5. Chưa đăng nhập: `/receipts` → bấm mã đã lưu hoặc nhập mã → modal. Thử mã sai/không tồn tại, đóng và tra cứu mã khác, xóa mã đã lưu.
6. Lịch sử đợt → Phiếu chỉ có ở lượt đã chốt. Mở URL phiếu cũ có cả hai loại action, kiểm tra replace/không tự in. Admin tìm mã → modal chỉ In phiếu/Tải PDF.

Kết quả kiểm tra giai đoạn 15: 101/101 unit test frontend PASS; lint PASS; build PASS. Rà code theo checklist modal/viewport/token/loading/error và phân vai đã thực hiện. SKIP toàn bộ browser, in thực tế, Android Chrome, iPhone Safari, Zalo Android/iOS, Facebook/Messenger theo yêu cầu chỉ kiểm tra code; chưa xác nhận kết quả in/lưu file thực tế trên các thiết bị này. Không kết nối DB, không chạy integration DB vì chỉ đổi frontend.

### Giai đoạn 16 — chi tiết đợt Admin (bố cục đã thay ở giai đoạn 17)

Trang `/admin/exam-rounds/:id` dùng header gọn: liên kết danh sách, tên/trạng thái, thời gian và đếm ngược. Một nút chính Mở/Đóng đợt qua `RoundStatusModal` hiện có; mobile gom QR/Báo cáo/Sửa vào menu ⋯.

- Nháp và Đã đóng chưa có lượt chính thức dùng Steps: thông tin/thời gian → câu hỏi → cơ cấu → mở. Bước 1 mở sửa, bước 2–3 chuyển tab. Tooltip Mở đợt liệt kê thiếu giờ bắt đầu/kết thúc, giờ kết thúc đã qua hoặc cơ cấu thiếu câu; form/status API Backend giữ nguyên.
- Mặc định Nháp chọn tab đầu chưa xong; Đang mở/Đã đóng chọn Thông tin. Tab lưu `?tab=overview|questions|structure`, giữ các query khác khi đổi tab, F5 giữ tab. Thông tin chia Thời gian/Cách thi/Tùy chọn.
- Câu hỏi bỏ card/tiêu đề lồng, có Import Excel và Thêm câu hỏi; menu ⋯ chứa mẫu/xuất Excel. Import thành công ở BY_GROUP nếu có nghị quyết mới chưa phân bổ thì hiện thông báo với nút Sang Cơ cấu đề.
- Cơ cấu: Alert khóa theo API `locked` (chỉ lượt chính thức); nhóm mới định mức 0 nổi lên đầu **chỉ ở giao diện**, vẫn giữ thứ tự sinh đề và nút đổi thứ tự theo dữ liệu gốc. Thanh tổng/xem mẫu/lưu sticky dưới tab. Không tự sửa dữ liệu cơ cấu khi sắp hiển thị.
- Đang mở/Đã đóng đọc báo cáo `isTrial=false`; số người tham gia và tỷ lệ đạt lấy đúng API. Khi đang mở refresh báo cáo/đợt/cơ cấu khoảng 30 giây (không tự lưu form). Có lượt chính thức hiện cảnh báo cơ cấu khóa và sửa câu chỉ cho lượt sau.

**Ghi nhận lịch sử giai đoạn 16, đã giải quyết ở giai đoạn 17 bằng summary theo lô:** API báo cáo khi đó trả participantCount, passedCount, failedCount, incompleteCount, passRate, attemptCount, averageAttempts; không có số lượt đang làm và đã nộp. Hai ô này hiển thị “—” và giải thích thiếu dữ liệu, không dùng incompleteCount để giả làm số đang làm. Hoàn thiện hai số này cần Backend cung cấp thêm số liệu, ngoài phạm vi “chỉ giao diện/không đổi API” của giai đoạn này. Không gọi lịch sử riêng từng người để tránh hàng nghìn request mỗi chu kỳ.

Phần Admin giai đoạn 16 và các helper/test Steps/tab cũ đã được dọn sau khi thay bằng giai đoạn 17; xem source hiện hành ở mục giai đoạn 17. `ExamRoundDetailPage` hiện chỉ phục vụ người thi. Test pool vẫn giữ đúng dev 3, production 20, trần 50.

Tự thử: `pnpm dev` → Admin → chi tiết đợt. Đối chiếu Nháp chưa câu/thiếu cơ cấu/đủ cơ cấu, Đang mở, Đã đóng có/chưa có lượt; bấm từng Steps, tooltip Mở, hộp xác nhận, đổi tab/F5, import nhóm mới, sắp nhóm và lưu, khóa sau lượt chính thức. Kiểm tra desktop 1440 và mobile 390 (menu ⋯, card câu hỏi, thanh sticky), light/dark. Không dùng dữ liệu thật để thử.

Đã chạy frontend: 106 test PASS, lint PASS, build PASS. Backend `pnpm test`: 108 PASS, 0 FAIL, 9 SKIP (suite integration cần DB test trống và dựng/xóa schema, không chạy trên DB dev). Lần chạy trong sandbox bị EPERM ở HTTP/OS; chạy lại ngoài sandbox với TEST_*DB_NAME không bật đã PASS. Không kết nối DB, tạo/reset/migrate/seed DB. Browser/đối chiếu trực quan 1440/390 SKIP theo chính sách chỉ kiểm tra code; checklist UI đã rà qua code.

### Giai đoạn 17 — danh sách và tổng quan đợt Admin

Route hiện hành `/admin/exam-rounds/:id?` dùng `AdminRoundsWorkspace` thay bố cục giai đoạn 16: >=1200px danh sách trái cuộn riêng/tổng quan phải; dưới 1200px danh sách → tổng quan. Chọn dòng giữ workspace và cập nhật URL. Lọc trạng thái có số lượng, search tên/mã phiếu, tạo chỉ hỏi tên. Mở/Đóng/QR/Xóa trên menu mỗi dòng; xóa chỉ khi chưa có lượt kể cả lượt thử. Menu Admin hiện chỉ Đợt kiểm tra / Tài khoản (trang hướng dẫn/Cài đặt chung đã bỏ theo yêu cầu sau giai đoạn 17).

Tổng quan xếp dọc số liệu chính thức/Cần làm, cấu hình, cơ cấu, top 10 đảng bộ theo số tham gia, 10 người vừa nộp, câu hỏi và 5 câu đúng thấp nhất. Các số đang làm/đã nộp không còn dấu “—” như giai đoạn 16: dùng summary Backend mới. Đã nộp bao gồm SUBMITTED và EXPIRED. Tỷ lệ Đạt theo người, không theo lượt; dữ liệu thử không tính. Đợt đang mở cập nhật khoảng 30 giây.

Drawer `?panel=config|structure|results|questions`, toàn màn hình điện thoại. Cấu hình ba nhóm, cảnh báo khi bỏ sửa chưa lưu. Kết quả có bộ lọc inline, xuất Excel theo bộ lọc đã áp dụng, menu xóa thử có xác nhận chỉ ở chế độ thử. Tái sử dụng RoundStructure, RoundQuestions, ReportTables, CommitteeReport, AdminAttemptHistory và modal phiếu. Từ lịch sử lượt có thể mở phiếu Admin để in/tải PDF.

Liên kết cũ reports/tab/receipts được replace về workspace/panel/modal tương ứng, không tự in. F5 giữ panel trên URL. API/hook mới vẫn tách riêng cache Admin/USER và dùng auth/CSRF hiện có.

Code chính:
- `pages/exam-rounds/AdminRoundsWorkspace.jsx`, `AdminRoundOverviewPage.jsx`, `round-workspace.css`.
- `components/exam-rounds/RoundConfigPanel.jsx`, `RoundStructure.jsx`; `pages/reports/RoundReportPage.jsx` dùng embedded trong drawer.
- `utils/adminRoundWorkspace.js` và test; routes/menu, metadata trong normalizeRoundList.

Đã chạy `pnpm test`: **112 PASS**, lint/build **PASS**. Không mở browser. Hướng dẫn tự thử 1440/1024/390, các drawer, deep link/F5 và liên kết cũ: [STAGE17_REVIEW](../docs/STAGE17_REVIEW.md). Tất cả kiểm tra trực quan/thao tác thực tế chưa xác minh theo yêu cầu chỉ kiểm code. Không tạo/reset/seed hoặc thay dữ liệu DB.

Cổng vào thi: bên trái xem trước **nguyên mẫu ReceiptSheet dùng để in/PDF**, thu nhỏ theo chiều rộng, cập nhật họ tên/đảng bộ/chi bộ theo form. Điểm, kết quả, thời gian nộp và mã để trống ở chế độ preview; phiếu thật không thay đổi. Mỗi ô có gợi ý tên đầy đủ/có dấu, không viết tắt. Mobile đặt mẫu trong mục thu gọn sau form để không đẩy form xuống sâu. Chỉ dữ liệu trên màn hình, không lưu thêm thông tin cá nhân hoặc đổi payload/API/phiếu thật. Tự thử: nhập/xóa từng ô, xem mẫu thay đổi; kiểm tra mobile/sáng-tối bằng tay.

### Dọn mã không dùng — 17/11/2026

Đã xóa `pages/receipts/AdminReceiptsPage.jsx`, `hooks/useDebouncedValue.js`, `components/exam-rounds/RoundReadiness.jsx`, `AdminRoundOverview.jsx`, `ExamRoundFormModal.jsx`. Hai trang `ExamRoundsPage`/`ExamRoundDetailPage` chỉ giữ luồng USER, Admin dùng workspace giai đoạn 17. Tách `RoundTimeInput.jsx` để cấu hình drawer dùng lại mà không kéo theo form modal cũ. Dọn helper/CSS và ba test riêng của Steps/tab/checklist cũ; giữ test luồng hiện hành và mapping liên kết cũ.

Kiểm tra: 111 test frontend PASS, lint/build PASS. Rà import tương đối từ `main.jsx`: không còn import thiếu hoặc file runtime frontend nằm ngoài cây sử dụng (loại trừ test). Kiểm tra static này không thay thế thử trực quan; không mở browser hoặc kết nối database. Các tài liệu review giai đoạn cũ giữ làm lịch sử, không phải mô tả source hiện hành. Giữ migration, test integration và Docker/deploy/load-test còn được gọi bởi script/tài liệu.
