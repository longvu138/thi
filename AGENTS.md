# Quy tắc bắt buộc cho AI

Mọi AI làm việc trong repository này phải tuân thủ các tài liệu sau và đọc theo phạm vi:

1. `AI_RULES.md` — quy tắc kiến trúc, API, bảo mật, kiểm thử **và quy tắc dùng context** (mục "Context Efficiency & Change Routing"); đọc phần backend/frontend/test tương ứng với thay đổi.
2. `README.md`, `frontend/README.md` và `backend/README.md` — phạm vi chức năng, cấu trúc source và hướng dẫn vận hành.
3. `docs/PLAN.md` — yêu cầu nghiệp vụ và thứ tự triển khai hệ thống kiểm tra nhận thức; làm đúng giai đoạn đang được giao, xong giai đoạn thì dừng chờ xác nhận.
4. Khi sửa UI, dùng `frontend/src/components/layout/`, `frontend/src/layouts/`, trang đăng nhập và màn quản lý tài khoản (khi đã có) làm mẫu; giữ các token, class và pattern hiện tại.

Quy tắc sử dụng context (định tuyến trước khi đọc, giới hạn phạm vi, một giả thuyết – một kiểm tra, khi nào dừng, báo cáo cuối phiên...) được định nghĩa **duy nhất** tại `AI_RULES.md` mục "Context Efficiency & Change Routing" — không lặp lại ở đây để tránh nạp trùng.

Khi sửa frontend phải giữ ngôn ngữ thiết kế hiện có theo `AI_RULES.md` và các màn hiện hữu; tham chiếu `frontend/src/components/layout/`, `frontend/src/layouts/` và các màn hiện hữu. Không tạo một ngôn ngữ giao diện riêng cho phân hệ mới nếu chưa có yêu cầu rõ ràng từ người dùng.

Trước khi báo hoàn thành thay đổi UI, AI phải:

- Rà soát mã theo checklist UI trong `AI_RULES.md`; tuân thủ mục "Chính sách kiểm tra hiện hành" về browser và database.
- Tái sử dụng component, class, token và pattern hiện có trước khi tạo mới.
- Chọn mức kiểm tra theo mục "Chọn mức kiểm tra theo phạm vi thay đổi" trong `AI_RULES.md`; project không dùng E2E/Playwright.
- Báo kiểm tra đã chạy, kết quả và phần không chạy kèm lý do.

