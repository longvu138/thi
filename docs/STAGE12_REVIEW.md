# Giai đoạn 12 — lưu theo lô, nộp toàn bộ

## Thay đổi

- Chọn đáp án cập nhật ở máy, không chờ mạng. Bỏ nhịp 500ms, gửi lô 30 giây chỉ các câu thay đổi, tối đa 500 câu/lô. Khi hidden/pagehide dùng fetch keepalive; tuần tự hóa với request đang chạy để tránh ghi đè lẫn nhau. Lỗi lô giữ hàng đợi cho nhịp sau, không hiện Alert giữa đề.
- sessionStorage theo mã lượt chỉ chứa map ID câu → A/B/C/D/null, modifiedAt từng câu, deadline; vị trí câu dùng khóa riêng. Không lưu nội dung đề/đáp án đúng; không lưu dữ liệu bài trong localStorage. Preference tự sang câu là boolean riêng theo trình duyệt.
- Mở lại tải Backend rồi hợp nhất lựa chọn local mới hơn qua answerUpdatedAt; chỉ câu khác vào hàng đợi. Revision mới không bị request cũ xóa. GET xác nhận server đã nhận sau mất phản hồi thì bỏ hàng đợi để không gửi lại. Xóa cache khi nộp/chốt/quá hạn/đăng xuất, không ghi cache sau unmount.
- Submit gửi toàn bộ lựa chọn, không chờ flush; Backend validate câu/phương án và ghi + chấm trong transaction dùng khóa attempt hiện có. SUBMITTED gọi lại không đổi kết quả/đáp án. Sau hạn + grace, chốt EXPIRED theo đáp án đã lưu trước và trả 409 ATTEMPT_EXPIRED, không nhận đáp án muộn. Body rỗng còn được chấp nhận để tương thích.
- Timeout riêng: lưu/keepalive 30s, nộp 60s, tải lượt/start/kết quả 30s; timeout chung không đổi. Nộp retry mạng tối đa 3 lần, giãn 1/2 giây; có Nộp lại nếu chưa xác nhận. Khi xác minh đã chốt, navigate replace thẳng kết quả, không thẻ trung gian.
- Kết quả ghi thời điểm nộp hoặc tự chốt, cảnh báo số lựa chọn chưa được ghi nhận khi có thông tin đó từ phiên làm bài. Modal xác nhận liệt kê câu chưa trả lời, bấm để quay lại.
- Icon đồng bộ cạnh timer, vùng thông báo cố định, nhắc 10/5 phút và giữ nhắc 5 phút; chỉ chỉnh deadline khi lệch server >2s. Mobile navigation cố định đáy + Drawer danh sách, Câu sau là nút chính, Bỏ chọn là link; công tắc tự sang câu mặc định theo mobile, nhớ preference và vị trí câu qua F5.

Không thay công thức chấm, giới hạn lượt, trial, đề/config_snapshot lịch sử. Không cần migration mới.

## File

Backend: `modules/attempts/attempts.{controller,validator,service}.js`, `attempts.submit.test.js`, integration attempts và `curl/attempts.curl`.

Frontend: `utils/attemptStorage.js`, `attemptBatch.js`, `attemptSession.js`, `attempts.js` và tests; `hooks/useAttempts.js`, `useAuthSession.js`; API attempts/results/httpClient; `pages/attempts/AttemptPage.jsx`, CSS, `components/attempts/AttemptQuestion.jsx`, `pages/results/AttemptResultPage.jsx`.

Quy tắc/tài liệu: AI_RULES.md (chính sách hiện hành), AGENTS.md dẫn chiếu, ba README, PLAN và UI_REFERENCE. Người dùng đã yêu cầu ngừng browser/DB mới trong khi triển khai; chính sách mới được áp dụng ngay, ưu tiên hơn chỉ dẫn kiểm tra cũ.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Frontend unit bản cuối | PASS 75/75, fail 0, skip 0 |
| Frontend lint/build bản cuối | PASS |
| Backend unit logic/submit validator/cURL | PASS 7/7, fail 0, skip 0 |
| Syntax controller/validator/service | PASS |
| Integration attempts trước khi người dùng đổi chính sách | PASS 3/3: HTTP quyền/IDOR, atomic submit full, concurrent chấm một lần, submit lại không đổi, late không ghi và giữ điểm từ đáp án đã lưu |
| Các nhóm backend khác chạy trước khi đổi chính sách | PASS 111, fail 0; 1 skip do attempts chạy riêng trên DB độc lập |
| Chạy lại toàn integration/schema sau đổi chính sách | SKIP — suite cũ yêu cầu schema rỗng và dựng/xóa bảng, không an toàn cho DB dev; không tạo DB thay thế |
| Browser/Slow 3G hoàn chỉnh sau đổi chính sách | SKIP — người dùng tự kiểm UI, AI đã dừng browser và server QA |

Trước chỉ đạo mới, đã quan sát chọn liên tục cập nhật ngay, không xuất hiện lỗi lưu giữa đề; bật tự sang câu và quan sát chuyển câu ở viewport 390×740 với preset DevTools “3G” của Chrome hiện tại. Chưa hoàn tất nộp/F5/throttling Slow 3G đầy đủ; không báo PASS end-to-end. Chưa đối chiếu đầy đủ desktop/tablet/mobile, dark mode, màn thấp, ADMIN/USER bằng mắt. Sau chỉ đạo mới không tiếp tục thao tác UI hoặc DB, đã dừng backend/preview QA riêng. Không sửa DB_NAME trong giai đoạn 12, không thay dữ liệu thật.

Unit phủ merge timestamp/local/server, ID ngoài đề, cache đúng cấu trúc, xóa khi submit/chốt/quá hạn/logout, nhịp 30s, revision trong request đang chạy, lô lỗi gửi bù, keepalive, retry nộp, route kết quả, auto-next, đồng hồ không chỉnh khi lệch nhỏ. Integration mới giữ trong source để hồi quy, không bỏ guard hoặc trỏ suite vào dev.

## Người dùng chạy thử

Dùng ứng dụng và DB dev hiện có; không cần dựng DB hoặc migrate:

1. Đăng nhập người thi, bắt đầu một lượt của đợt dev có đủ câu; DevTools tự đặt Slow 3G. Chọn liên tục: lựa chọn phải đổi ngay, không có Alert lưu sau mỗi click. Sau khoảng 30s xem request PUT answers theo lô.
2. Chọn đáp án, chuyển câu, F5: vị trí và lựa chọn được khôi phục. Xem sessionStorage chỉ có ID/lựa chọn/timestamp/deadline và vị trí, không có nội dung đề/đáp án đúng. Ẩn tab để kiểm keepalive.
3. Tắt mạng, chọn thêm rồi bật mạng: lựa chọn tại máy không mất, được gửi bù. Chờ nộp: màn Đang nộp bài…, retry rồi Nộp lại nếu chưa xác nhận được. Không báo đã hoàn thành khi server chưa xác nhận.
4. Xác nhận nộp: bấm một số câu chưa trả lời để quay lại; nộp gửi đủ mọi lựa chọn gồm null. Khi xong phải vào thẳng /attempts/:id/result, Back không quay lại route làm bài vừa thay thế. Kết quả hiện thời gian nộp hoặc thông báo tự chốt.
5. Thử mobile: navigation đáy, Drawer danh sách, bật/tắt auto-next; kiểm tablet/desktop, phím tắt, light/dark và màn thấp. Kiểm cache bị xóa sau nộp/chốt/hết hạn/đăng xuất.

## Còn lại

Phần code/test tự động trong phạm vi đã triển khai. Người dùng tự xác minh UI, Slow 3G, F5/end-to-end và cảnh báo khi hết giờ đúng lúc offline. Không tiếp tục tạo DB/QA hoặc mở browser; chưa chạy full integration trên DB dev vì suite hiện có có thao tác dựng/xóa schema. Không thực hiện giai đoạn tiếp theo.
