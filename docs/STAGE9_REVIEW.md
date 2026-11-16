# Rà soát MVP – giai đoạn 9 (12/11/2026)

Chỉ sửa phần thiếu/sai và dependency trực tiếp. Không chạy migration/reset hoặc thử tải trên database ứng dụng; không làm Docker, VPS, backup/restore.

## Thay đổi

- Thêm `backend/scripts/load-test.js`, logic/test và lệnh `pnpm load-test` ở backend/gốc. Chỉ chạy local, DB `exam_load_test_*`, đợt E2E_ROUND_ đang chạy thử; handshake chứng minh server cùng DB trước khi tạo dữ liệu. Tạo danh tính E2E_LOAD_, start cạnh tranh, lưu/nộp qua API, báo mean/p95/lỗi và kiểm giới hạn lượt/IN_PROGRESS.
- Start có tùy chọn `trialOnly:true`, kiểm cửa sổ thử dưới khóa trước resume/tạo lượt. Không lọt sang chính thức khi cửa sổ kết thúc. Body `{}` vẫn giữ hành vi cũ.
- Sửa hàng đợi lưu: lỗi mạng/503 dù navigator còn online được tự gửi lại với backoff 1/2/4… tối đa 30 giây; giữ dữ liệu RAM, không retry lỗi nghiệp vụ. Thêm test retry nộp 1/2 giây và nút Nộp lại phục hồi.
- Bổ sung nhãn Chạy thử trên bảng đợt desktop. Giữ component/token/layout hiện có.
- Startup production từ chối cookie Secure=false; thêm test. Tách validator tra cứu phiếu đúng module; không đổi contract phiếu.
- Cập nhật cURL start/health, `.env.example`, README local/thử tải; không hạ rate limit trên server thật.

## Đối chiếu PLAN mục 3–13

| Nhóm yêu cầu | Kết quả | Bằng chứng |
|---|---|---|
| Nhận diện người dự thi; ADMIN; hash Argon2id, phiên/thu hồi | Đạt kiểm tra | stage1/participants integration, auth/security unit |
| Cookie HttpOnly/SameSite/Secure, CSRF, role, IDOR | Đạt kiểm tra | app.security, security/auth-cookie, HTTP 401/403/CSRF/IDOR trong integration |
| Câu riêng theo đợt, mã unique phạm vi đợt; Excel 2–4 lựa chọn, preview/commit nguyên tử | Đạt kiểm tra | questions unit/integration; cùng mã khác đợt, trùng cùng đợt, rollback, export/import |
| Tạo Nháp, đủ câu mới OPEN, chặn xóa thiếu câu; xóa kèm câu khi chưa có lượt | Đạt kiểm tra | exam-rounds/questions integration, xóa đồng thời |
| Random đủ/không trùng; cờ xáo; không lộ đáp án/khóa gốc trước chốt | Đạt kiểm tra | attempts logic/integration; serialize whitelist frontend/backend |
| maxAttempts 1/2/3, resume/F5, stopAfterPass true/false, race/unique khóa User | Đạt kiểm tra | attempts/participants integration; start đồng thời; smoke load start đôi |
| Hết giờ job/chốt lười, ân hạn, chấm 1 lần; 14/20 đạt, 13/20 không đạt | Đạt kiểm tra | attempts logic/job/integration; submit cạnh tranh; không sửa đáp án đã chốt |
| Snapshot cấu hình/câu/lựa chọn/nhóm, lịch sử không đổi sau sửa/xóa | Đạt kiểm tra | attempts/results/reports/receipts integration |
| Gom nhóm, cảnh báo 10/5, offline/RAM/gửi lại, retry nộp/Nộp lại, phím tắt | Đạt logic; UI một phần | attempts/attemptSession unit, UI desktop chọn A và →, tự lưu; chưa mô phỏng offline qua browser |
| Trial: mốc giờ/is_trial/số lượt riêng, tách báo cáo, xóa thử/audit | Đạt kiểm tra | attempts/reports/receipts integration; trialOnly biên chính thức; cleanup API thực tế |
| Dashboard người khác lượt, PASS ưu tiên, lọc đơn vị; thống kê A/B/C/D gốc/bỏ trống; Excel Theo câu hỏi | Đạt kiểm tra | reports integration kiểm số liệu, đảo khóa gốc, lọc, workbook 3 sheet, audit |
| API validation, phân trang, lỗi/audit, import transaction | Đạt phạm vi test | validator/unit và HTTP integration theo module; cURL auth/CSRF test |
| QR/phiếu bổ sung | Đạt hồi quy | frontend authRouting/receipts unit và receipts integration; public phiếu bằng mã là yêu cầu chủ động, không mở truy cập đề/đáp án/ID lượt công khai |
| Script tải + hướng dẫn local/env | Đạt smoke test | scripts/load-test.test.js, load chạy API thật/DB riêng; README và env example |
| Toàn bộ checklist UI light/dark, ADMIN/USER, 1440/1024/768/390, màn thấp | **Chưa kiểm đủ** | chi tiết bên dưới; không coi đọc CSS/unit test là pass trực quan |

## Kiểm tra đã chạy

- Backend `pnpm test` với cả 7 TEST_*_DB_NAME: **95 pass, 0 fail, 0 skip**.
- Backend `pnpm test:database`: **14 pass, 0 fail, 0 skip**, trên DB rỗng riêng `exam_{stage1,participants,questions,rounds,attempts,reports,receipts}_test_stage9`; fixture tự dọn bảng.
- `node --check` các file backend sửa/thêm: pass. cURL auth/CSRF test: 2/2 pass.
- Frontend `pnpm lint`, `pnpm test`, `pnpm build`: pass, **66 unit test**, không skip.
- Smoke load trên `exam_load_test_stage9`, API QA cổng 3189, 20 kịch bản/4 người; 12 lượt hoàn thành, 8 kịch bản bị giới hạn 3 lượt/người. 68 request: mean 18,87 ms; p95 37,71 ms. HTTP 409: 16 (hai start/kịch bản hết lượt), không có lỗi ngoài dự kiến. Không lượt chính thức/vượt lượt/hai IN_PROGRESS.
- Thử sai DB handshake: từ chối trước khi tạo dữ liệu, exit 1 đúng dự kiến. Unit chặn đợt Nháp/đóng/chính thức/ngoài cửa sổ/E2E sai.
- Đã gọi DELETE trial-data bằng ADMIN/cookie/CSRF trên QA, xóa 25 lượt (hai lần smoke + một lượt UI), có audit; kiểm lại attempts/attempt_receipts đều 0. Không đụng dữ liệu thật. Log/build QA ở /tmp; output thường bị ignore, không thêm artifact test vào source.

## UI đã/không đối chiếu

Chrome trên frontend QA 3118/backend QA3189, chỉ dữ liệu E2E: trang vào thi → danh sách → bắt đầu/resume, nhãn Chạy thử trong màn thi, nhóm câu bên phải desktop; chọn A và → chuyển câu, tiến độ/tự lưu cập nhật. Đã xem desktop khoảng 1512px, tablet **768px**, mobile **412px**; câu/lựa chọn đọc được, navigator xuống dưới trên mobile. Bảng desktop thiếu nhãn Chạy thử được sửa theo pattern Tag hiện hữu và lint/build; chưa xem lại trực quan đủ mọi vai trò sau sửa.

Chưa kiểm đủ 1440/1024/390 chính xác, dark, màn thấp/Modal dài; chưa đối chiếu trực quan toàn ADMIN, browser offline/backoff/retry nộp và mốc cảnh báo 10/5 bằng đồng hồ thực. Các hành vi logic/quyền có test tự động nhưng không thay thế phần UI còn thiếu. Phiếu/máy in vật lý, quét QR bằng điện thoại thật cũng chưa kiểm lại trong giai đoạn này. Không dùng E2E/Playwright. Trình duyệt bị đổi trong lúc QA nên đã dừng thao tác tiếp để không can thiệp thao tác người dùng.

## Phần còn lại / chặn nghiệm thu

Chưa phát hiện blocker nghiệp vụ/bảo mật trong phạm vi các kiểm tra đã chạy. **Chưa thể kết luận đạt toàn bộ checklist UI** cho đến khi hoàn tất ma trận nêu trên. Thử tải mới là mẫu local nhỏ, không phải xác nhận năng lực tải production hoặc SLA. Không tự triển khai/hạ tầng tiếp theo.

Cách chạy local, chuẩn bị DB/đợt chạy thử và lệnh tải: [backend README](../backend/README.md#giai-đoạn-9-kiểm-tra-mvp-và-thử-tải-local). Để nghiệm thu: dùng DB test, thử các luồng còn thiếu và đánh dấu lại bảng này; sau đó chờ người dùng xác nhận.
