# Hệ thống kiểm tra nhận thức trực tuyến

> Chính sách kiểm tra hiện hành: xem `AI_RULES.md` ở root repository. AI không mở browser/test UI, không tự tạo DB hoặc đổi DB_NAME; dùng DB dev hiện có cho kiểm tra an toàn. Các lệnh integration dựng/xóa schema dưới đây là tài liệu suite cũ, không chạy trên DB dev; người dùng tự kiểm UI.


Project gồm 2 source độc lập, mỗi source tự quản lý dependency bằng pnpm và có `pnpm-lock.yaml` riêng (không dùng workspace):

- `backend`: Node.js Express 5 + MySQL 8 + Knex migration (JavaScript CommonJS).
- `frontend`: React 19 + Vite + Ant Design 6 + Tailwind 4 + TanStack React Query (JavaScript/JSX).

Yêu cầu nghiệp vụ và thứ tự triển khai: [docs/PLAN.md](docs/PLAN.md).

## Trạng thái hiện tại

Source đã được dọn từ hệ thống cũ (HTS), chỉ giữ phần nền:

- Đăng nhập/đăng xuất/`/auth/me` với cookie HttpOnly, phiên lưu trong bảng `auth_sessions`, CSRF token, rate limit đăng nhập. Hai vai trò `ADMIN`/`USER` (`backend/src/constants/roles.js`), middleware `requireAdmin`/`requireRole`.
- Hạ tầng backend: helmet, CORS, request id, Winston log/audit log, error middleware, `AppError`, phân trang, LIKE an toàn, thời gian UTC.
- Khung frontend: layout desktop/mobile, Error Boundary, `httpClient` dùng chung, trang đăng nhập, trang chủ tạm `/home`.

Giai đoạn 1 đã bổ sung migration nền cho toàn bộ bảng, Argon2id, CLI tạo admin và quản lý tài khoản ADMIN tại `/admin/users`. Giai đoạn 2 đã bổ sung câu hỏi và import Excel (đã chuyển sang câu hỏi riêng theo đợt ở giai đoạn 8); Giai đoạn 3 đã có quản lý và xem đợt kiểm tra; đã có API lượt thi ở giai đoạn 4, giao diện làm bài ở giai đoạn 5 và kết quả cá nhân ở giai đoạn 6.

## Chạy local

```bash
pnpm install          # cài concurrently ở thư mục gốc
pnpm dev              # chạy song song backend và frontend
```

Hoặc từng phần: `cd backend && pnpm install && pnpm dev`, `cd frontend && pnpm install && pnpm dev`.

Frontend: http://localhost:3110, backend: http://localhost:3108, `pnpm preview` của frontend dùng cổng 4174. Cookie local tên `exam_session`.

## Cài database

```sql
CREATE DATABASE exam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Cấu hình `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=exam` trong `backend/.env` (mẫu ở `backend/.env.example`), rồi `cd backend && pnpm migrate`. Admin đầu tiên tạo bằng `cd backend && pnpm create-admin` (nhập tài khoản, họ tên, mật khẩu ẩn). CLI từ chối khi đã có ADMIN; `--force` cho phép tạo thêm ADMIN.

## Kiểm tra

- Backend: `cd backend && pnpm test` (không cần database); `pnpm test:database` cho integration test trên database riêng (từ giai đoạn 1).
- Frontend: `cd frontend && pnpm lint && pnpm test && pnpm build`. Không dùng E2E/Playwright.

## Định tuyến source

| Phần | Frontend (`frontend/src`) | Backend (`backend/src`) |
| --- | --- | --- |
| Đăng nhập/phiên | `pages/auth`, `api/authApi.js`, `hooks/useAuthSession.js` | `modules/auth`, `middlewares/auth.middleware.js` |
| Khung ứng dụng/menu | `app/`, `layouts/`, `components/layout/` | `app/` |
| Báo cáo (ADMIN) | `pages/reports`, `components/reports`, `api/reportsApi.js`, `hooks/useReports.js` | `modules/reports` |
| Làm bài (USER) | `pages/attempts`, `components/attempts`, `api/attemptsApi.js`, `hooks/useAttempts.js`, `utils/attemptSession.js` | `modules/attempts` |
| Đợt kiểm tra | `pages/exam-rounds`, `components/exam-rounds`, `api/examRoundsApi.js`, `hooks/useExamRounds.js` | `modules/exam-rounds` |
| Câu hỏi (ADMIN) | `components/questions/RoundQuestions.jsx`, `components/questions`, `api/questionsApi.js`, `hooks/useQuestions.js` | `modules/questions` |
| Tài khoản (ADMIN) | `pages/users`, `api/usersApi.js`, `hooks/useUsers.js` | `modules/users`, `scripts/create-admin.js` |
| Trang chủ tạm | `pages/home` | — |

Backend tách route/controller/validator/service theo module trong `modules/`; hạ tầng chung ở `config`, `constants`, `middlewares`, `utils`. Frontend gọi HTTP qua `api`, quản lý server state bằng React Query trong `hooks`; page chỉ điều phối component và hook. Menu và điều kiện vào route theo vai trò khai báo ở `frontend/src/app/navigation.js`.

## Triển khai

Hosting Node.js/cPanel (không Docker): xem [hướng dẫn deploy hosting](docs/DEPLOY_HOSTING.md). Docker Compose/VPS: xem `docs/VAN_HANH.md`.

## Câu hỏi theo đợt (giai đoạn 8)

ADMIN tạo đợt Nháp tại `/admin/exam-rounds`, mở chi tiết → tab **Câu hỏi** để thêm/sửa/xóa hoặc vô hiệu hóa, tìm/lọc nhóm, xem số câu hợp lệ, tải mẫu, import và xuất Excel sang đợt mới. Không còn trang/menu ngân hàng riêng; thêm đủ câu rồi sửa trạng thái đợt thành OPEN. Dữ liệu thật do quản trị viên tự chuẩn bị và xác nhận nhập; ứng dụng không tạo bộ câu hỏi mẫu. Xem chi tiết contract import trong `backend/README.md`.

## Đợt kiểm tra (giai đoạn 3)

ADMIN mở `/admin/exam-rounds` để tạo/sửa/xóa đợt và cấu hình số câu, thời lượng, số lượt, ngưỡng đạt, thời gian, trạng thái và tùy chọn. USER mở `/exam-rounds` để xem danh sách/chi tiết OPEN/CLOSED (ẩn DRAFT). Thời gian hiển thị theo Asia/Ho_Chi_Minh. Đã bổ sung nút bắt đầu/tiếp tục và giao diện làm bài ở giai đoạn 5.

## Vào thi bằng thông tin người dự thi

Trang `/login` nhận Họ và tên, Đảng bộ, Chi bộ rồi chuyển tới `/exam-rounds`. Nhập lại cùng bộ ba thông tin sẽ dùng cùng ID để giữ lịch sử/số lượt; không phân biệt hoa/thường hoặc khoảng trắng thừa, vẫn phân biệt dấu. Quản trị viên đăng nhập bằng tài khoản/mật khẩu tại `/admin/login`.

Sau khi cập nhật source, chạy `cd backend && pnpm migrate` để thêm cột nhận diện người dự thi. Schema giai đoạn 8 đã sửa migration nền theo PLAN, chỉ dựng lại trên database dùng một lần; không tự ghép tài khoản cũ với người dự thi khi chưa có đủ đảng bộ/chi bộ. Phần làm bài và kết quả đã triển khai ở giai đoạn 4–6.

## Giai đoạn 4

Backend đã có start/resume, đề snapshot, lưu đáp án, nộp bài/chấm điểm và job hết giờ, kèm lượt chạy thử tách riêng. Xem contract/test và lưu ý dựng lại schema phát triển trong `backend/README.md`. Giao diện làm bài/kết quả đã có ở giai đoạn 5–6; kiểm tra API bằng `backend/curl/attempts.curl`.

## Giai đoạn 5

USER có luồng Bắt đầu / Tiếp tục từ danh sách/chi tiết đợt tới `/attempts/:id`: đồng hồ server, chọn đáp án, điều hướng câu/nhóm, tự lưu, mất mạng và xác nhận nộp bài. Khôi phục dữ liệu đã lưu sau F5 hoặc nhập lại thông tin. Đáp án chưa lưu chỉ ở bộ nhớ trang; không đóng/tải lại khi còn pending. Sau khi chốt có xác nhận và nút Xem kết quả được bổ sung ở giai đoạn 6. Xem quy trình thử trong `frontend/README.md`.

## Giai đoạn 6

Đã có API kết quả lượt thi `/api/attempts/:id/result`, lịch sử `/api/my-results` và giao diện USER `/attempts/:id/result`, `/my-results`. Chấm điểm tiếp tục dùng cùng hàm của giai đoạn 4, so sánh số nguyên; đáp án đúng chỉ công bố sau khi kết thúc và snapshot cho phép. Lịch sử giữ mọi lượt; lượt thử không tính kết quả cuối chính thức. Không cần migration mới. Cách chạy/test và cURL xem README backend/frontend; báo cáo quản trị đã có ở giai đoạn 7.


## Giai đoạn 7

ADMIN mở danh sách/chi tiết đợt → **Báo cáo / Kết quả và báo cáo** (`/admin/exam-rounds/:id/reports`) để xem dashboard, lọc kết quả từng người, thống kê câu hỏi và xuất Excel. Mặc định chỉ tính lượt chính thức, có chế độ xem riêng/xóa dữ liệu chạy thử với xác nhận. Excel gồm Tổng hợp, Chi tiết, Theo câu hỏi, Theo đảng bộ; dùng cùng bộ lọc và cách tính kết quả cuối. Không cần migration mới; dữ liệu người dự thi dùng migration nhận diện đã có. Chi tiết API, cURL và database test trong README backend/frontend. Đã thực hiện chuyển câu hỏi theo đợt ở giai đoạn 8; giai đoạn 9 được rà soát tại [docs/STAGE9_REVIEW.md](docs/STAGE9_REVIEW.md). Không làm Docker/VPS.

## Phiếu kết quả và in lại bằng mã

Sau khi làm xong, người dự thi nhận mã và bấm **Lưu / In phiếu** để mở modal xem trước, in A4, tải PDF hoặc lưu ảnh trên điện thoại. Modal không tự in và không chuyển trang. Khi không còn phiên đăng nhập, chọn **Tra cứu / In lại phiếu kết quả bằng mã** trên cổng vào thi (`/receipts`), nhập mã rồi in lại. Trình duyệt chỉ lưu mã, tối đa 10 mã gần nhất. Phiếu dùng snapshot, không thay điểm/lịch sử thi.

Áp dụng migration mới bằng `cd backend && pnpm migrate` để thêm `attempt_receipts`; không reset database hiện có. Hướng dẫn/test/API xem README backend/frontend và `backend/curl/receipts.curl`. Đây là yêu cầu bổ sung sau giai đoạn 8; giai đoạn 9 rà soát cả hồi quy phiếu.

## Giai đoạn 9

Đã bổ sung kiểm tra MVP; kết quả lịch sử ở [STAGE9_REVIEW](docs/STAGE9_REVIEW.md). Kịch bản thử tải cũ được thay bởi giai đoạn 13, xem [VAN_HANH](docs/VAN_HANH.md).

Giai đoạn 10: xác nhận trước khi tạo lượt, trạng thái tham gia riêng từng người, QR chuyển sang Admin (in/tải PNG), mở/đóng nhanh, tổng hợp theo đảng bộ và lịch sử từng lượt chỉ đọc cho Admin. Không thêm migration; MySQL cần quyền CREATE TEMPORARY TABLES để tổng hợp báo cáo theo lô. Xem [báo cáo kiểm tra giai đoạn 10](docs/STAGE10_REVIEW.md).


Giai đoạn 11 thay chia đề/bộ đề tạo trước bằng **Cơ cấu đề**: RANDOM hoặc BY_GROUP, luôn sinh ngẫu nhiên mỗi lượt. Backend tính số câu, kiểm khả năng từng nhóm, khóa khi đã có lượt chính thức; Admin xem mẫu chưa lưu bằng API chỉ đọc có audit. Form tạo/sửa đợt không nhận số câu; cấu hình ở tab Cơ cấu đề. Migration `202611130001_round_papers.js` chỉ còn selection_config, cần dựng lại DB dev/test. Phiên triển khai đã dựng dev mới `exam_stage11_dev`, chuyển tài khoản Admin và cập nhật backend/.env; dữ liệu nguồn bai_thi giữ nguyên. Khởi động lại backend, đăng nhập lại để dùng dev mới. Xem [STAGE11_REVIEW](docs/STAGE11_REVIEW.md).

Giai đoạn 12: lựa chọn lưu tạm sessionStorage (không lưu nội dung đề/đáp án đúng), gửi lô 30 giây và gửi toàn bộ khi nộp; nộp atomic/idempotent, điều hướng thẳng kết quả; bổ sung navigation đáy/Drawer/tự sang câu trên điện thoại. Không cần migration hoặc DB mới. Chính sách hiện hành: AI không test UI browser, không tạo DB/QA, chỉ dùng DB dev an toàn; người dùng tự thử UI/Slow 3G. Chi tiết [STAGE12_REVIEW](docs/STAGE12_REVIEW.md).

## Triển khai Docker — giai đoạn 13

Cấu hình cũ đã được thay bằng Compose MySQL 8.4 → migrate → một Backend → Caddy + frontend build. Xem [hướng dẫn vận hành](docs/VAN_HANH.md) cho cài mới, HTTPS/LAN, tạo admin, rate limit, thử tải 1000 người, cron backup và restore có xác nhận. Copy `.env.production.example` thành `.env.production`, tự tạo secret riêng, không commit; chạy `docker compose --env-file .env.production up -d --build --wait`. Không mặc định coi test local là bằng chứng đủ tải máy chủ thật.

Giai đoạn 15: cửa sổ phiếu dùng chung cho kết quả/tra cứu/lịch sử/Admin; hướng dẫn và checklist tự thử tại [frontend/README.md](frontend/README.md#giai-đoạn-15--cửa-sổ-phiếu-dùng-chung). Chỉ kiểm tra code/unit/lint/build, chưa thử thiết bị hoặc in thực tế.

Giai đoạn 16: chi tiết đợt Admin có Steps chuẩn bị, tab trên URL, đếm ngược, menu mobile và cơ cấu sticky. Test pool đúng dev 3/production 20/tối đa 50. Ghi nhận này đã được thay thế ở giai đoạn 17 (summary theo lô đã có đủ đang làm/đã nộp); xem [frontend/README.md](frontend/README.md) để biết giới hạn và cách thử.

Giai đoạn 17: Admin Đợt kiểm tra dùng workspace danh sách/tổng quan và Drawer config/structure/results/questions. API danh sách có summary theo lô + statusCounts; kết quả hỗ trợ sort latestAt trước phân trang. Không migration/đổi chấm điểm hoặc snapshot. Kiểm tra code: frontend 112 PASS, lint/build PASS; backend 113 PASS, 9 integration DB SKIP. Chi tiết, giới hạn xác minh và checklist người dùng tự thử: [STAGE17_REVIEW](docs/STAGE17_REVIEW.md).
