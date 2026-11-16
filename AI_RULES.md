# AI Coding Rules

> Khi sửa frontend, tham chiếu layout và các màn hiện hữu (đăng nhập, quản lý tài khoản khi đã có). Giữ ngôn ngữ giao diện và checklist UI bên dưới; không tạo phong cách riêng khi chưa có yêu cầu.

## Context Efficiency & Change Routing

1. **Định tuyến trước khi đọc:** Bắt đầu từ file, symbol, lỗi, endpoint hoặc test được nêu trong yêu cầu. Dùng cấu trúc trong `README.md` và route của module để tìm lớp trực tiếp sở hữu hành vi.
2. **Đọc theo dependency gần:** Với frontend, ưu tiên `component -> hook -> api -> backend route/controller/service`; với backend, ưu tiên `route -> controller -> policy/validator -> query/command -> migration/test`.
3. **Giới hạn phạm vi:** Không đọc toàn bộ thư mục hoặc toàn bộ repository nếu chưa có bằng chứng dependency. Mỗi lần mở rộng phải nêu được file nào gọi hoặc cung cấp contract cho file hiện tại. Khi thêm file mới hoặc cần biết code thuộc module nào/được phép import từ đâu, tra cấu trúc trong `README.md`; backend đặt code theo module, frontend theo page/component/hook/api.
4. **Không lặp context:** Tài liệu trong `AGENTS.md`, `AI_RULES.md` và các README là context nền; không sao chép lại toàn bộ nội dung đó trong prompt hoặc tài liệu mới.
5. **Một giả thuyết, một kiểm tra:** Trước lần sửa đầu tiên, xác định nguyên nhân giả định và một kiểm tra rẻ nhất có thể bác bỏ nó. Sau lần sửa đầu tiên, chạy ngay kiểm tra hẹp nhất phù hợp.
6. **Ưu tiên thay đổi nhỏ:** Sửa đúng lớp quyết định hành vi, giữ nguyên public API và style hiện có nếu yêu cầu không cần thay đổi contract.
7. **Tạo tài liệu định tuyến khi cần:** Nếu thêm module lớn hoặc thay đổi kiến trúc, cập nhật README tương ứng về cấu trúc, phạm vi và quy tắc nghiệp vụ trong cùng phiên.
8. **Prompt theo phạm vi:** Prompt nên nêu module/symbol, hành vi lỗi, điều kiện chấp nhận và test cần chạy; không yêu cầu AI “hiểu toàn bộ source” nếu không cần.

### Mẫu prompt nội bộ

```text
Đọc AGENTS.md, AI_RULES.md và README theo module.
Phạm vi: <file hoặc module> và test trực tiếp liên quan.
Vấn đề: <hành vi hiện tại>.
Yêu cầu: <hành vi mong muốn>.
Không mở rộng phạm vi nếu chưa có dependency cụ thể.
Sửa, cập nhật test và chạy kiểm tra hẹp nhất trước.
```

## Backend API Rules & Test Scenarios

When generating or modifying backend APIs, the AI must strictly adhere to the following rules regarding API design, **cURL Generation**, and **Modular Test Scenarios**:

1. **Bắt buộc sinh cURL cùng API:** Mọi API được tạo mới hoặc sửa đổi đều phải đi kèm với file cURL test tương ứng trong cùng một phiên làm việc. Cập nhật file cURL ngay khi API thay đổi thiết kế payload hoặc endpoint.
2. **Tách nhỏ tệp tin cURL để dễ quản lý (Modular Test Files):**
   - Tuyệt đối KHÔNG gộp chung tất cả các bài test của hệ thống vào một file lớn (ngoại trừ khi người dùng yêu cầu kịch bản tích hợp toàn trình).
   - Phân rã tệp cURL theo phân hệ nghiệp vụ hoặc nhóm endpoint riêng biệt dưới thư mục `backend/curl/`.
   - Quy chuẩn đặt tên: `backend/curl/<ten_nghiep_vu>.curl` (Ví dụ: `auth.curl`, `users.curl`, `questions.curl`, `exam-rounds.curl`, `attempts.curl`).
3. **Mỗi API phải có đầy đủ 3 loại Kịch bản kiểm thử (Test Scenarios):**
   - **Kịch bản Thành công (Success Scenario - Happy Path):** Test với dữ liệu hợp lệ tối giản (chỉ có các trường bắt buộc) và kịch bản đầy đủ (chứa cả các trường tùy chọn).
   - **Kịch bản Lỗi nghiệp vụ & Ràng buộc (Validation Scenario - Unhappy Path):** Kiểm thử khi thiếu trường bắt buộc (ví dụ: thiếu `username`, `fullName`, `questionCode`), hoặc truyền sai định dạng dữ liệu. Đảm bảo API trả về mã lỗi `422 Unprocessable Entity` và thông điệp lỗi rõ ràng.
   - **Kịch bản Bảo mật & Phân quyền (Security Scenario):** Kiểm thử với trường hợp không truyền Token đăng nhập (trả về `401 Unauthorized`), Token hết hạn, hoặc đăng nhập bằng tài khoản không đủ thẩm quyền để gọi API (ví dụ tài khoản USER gọi API `/api/admin/...` -> phải trả về `403 Forbidden`).
4. **Quy cách định dạng tệp cURL:**
   - Sử dụng lệnh cURL thuần túy (không sử dụng định dạng `.http` của các extension khác) để người dùng có thể dễ dàng sao chép chạy trực tiếp bằng Terminal hoặc import vào Postman.
   - Sử dụng comment rõ ràng bằng dấu `#` để phân biệt mục tiêu của từng kịch bản test (Ví dụ: `# [Kịch bản 1.1] Đăng nhập tài khoản Admin`).
   - Ghi chú rõ ràng nơi cần thay thế Token động dạng `<ACCESS_TOKEN>`.
5. **Thiết kế API nhất quán:**
   - Logic nghiệp vụ phải được tách biệt rõ ràng giữa Route, Controller, và Database query (Knex).
   - Các API thêm/sửa/xóa dữ liệu phải ghi audit log qua `auditLog` (`backend/src/utils/audit-log.js`), gồm người thực hiện (`req.user.id`) và dữ liệu bị thay đổi.
   - Phản hồi JSON luôn đồng bộ về định dạng (CamelCase) và sử dụng đúng HTTP status codes (`200 OK`, `201 Created`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`, `500 Internal Server Error`).
   - Quy tắc mã lỗi: `403` thiếu quyền/ngoài phạm vi; `404` không tìm thấy; `409` xung đột với dữ liệu đã lưu (phiên bản cũ, trạng thái đã hoàn thành/đã chuyển/đã hủy, hết lượt thi, đợt đã đóng, lượt đã nộp/hết giờ, mất admin cuối cùng); `422` dữ liệu gửi lên sai (thiếu trường, sai định dạng, mâu thuẫn ngay trong cùng request). Giữ nguyên trường `code` đã công bố (ví dụ `CSRF_TOKEN_INVALID`).
   - Lỗi HTTP dùng `AppError`/`httpError` trong `backend/src/utils/http-error.js`; không tự tạo `new Error` + `statusCode`. Phân trang dùng `backend/src/utils/pagination.js` (page sai về 1, limit kẹp 1..100); tìm kiếm LIKE dùng `containsPattern` trong `utils/sql-like.js`; thời gian xuất ISO UTC qua `utils/datetime.js`.
   - Đã mở transaction thì mọi truy vấn trong luồng đó dùng `trx` (mẫu `client = options.trx || db`); băm mật khẩu (Argon2id) và validation thuần chạy trước khi mở transaction để không giữ kết nối pool.
6. **Ngôn ngữ thông điệp báo lỗi (Error Messages Language):**
   - Bắt buộc 100% tất cả các thông điệp báo lỗi (error messages) trả về từ backend (trong các controller, validator, middleware...) phải được viết bằng **TIẾNG VIỆT** chuẩn mực, lịch sự và rõ ràng.
   - Ví dụ: Thay vì `"title is required"`, hãy trả về `"Mã câu hỏi là bắt buộc"`. Thay vì `"Unauthorized"`, hãy trả về `"Không có quyền truy cập, vui lòng đăng nhập"`.

## Frontend Rules

When generating or modifying frontend UI:

1. Use React with functional components.
2. Use Ant Design components for UI:

- `Table` for data tables.
- `Form`, `Input`, `Select`, `Modal`, `Drawer` for forms and detail views.
- `Tag`, `Badge`, `Progress`, `Statistic` for status and metrics.

3. Use Axios only through shared API clients under:

```text
frontend/src/api/
```

4. Do not call Axios directly inside components.
5. Use TanStack React Query for all server state:

- `useQuery` for list/detail data.
- `useMutation` for create/update/delete.
- Invalidate or update query cache after mutations.

6. React Query hooks must live under:

```text
frontend/src/hooks/
```

7. Keep UI components focused and reusable under:

```text
frontend/src/components/
```

8. Pages should compose hooks, layout, and components under:

```text
frontend/src/pages/
```

9. Keep shared options/constants under:

```text
frontend/src/constants/
```

10. Do not put a full feature in `App.jsx`. `App.jsx` should only provide app-level providers/theme and render pages.

11. **Null-safe UI bắt buộc để tránh trắng trang:**

- Mọi component nhận dữ liệu từ API phải có default props hoặc fallback an toàn, ví dụ `items = []`, `stats = {}`, `progressCounts = {}`.
- Trước khi gọi `.map()`, `.filter()`, `.reduce()`, `.find()`, `.slice()` trên dữ liệu API phải đảm bảo dữ liệu là array bằng `Array.isArray(value) ? value : []`.
- Không truy cập sâu trực tiếp vào object có thể null như `record.stats.total`; phải dùng optional chaining hoặc fallback: `record.stats?.total`, `const stats = record.stats || {}`.
- Khi đọc `localStorage` và `JSON.parse`, bắt buộc dùng `try/catch`; nếu parse lỗi phải xóa cache hỏng hoặc fallback về `null`.
- App React phải được bọc bằng Error Boundary ở tầng cao để lỗi render không làm trắng toàn bộ trang. Error Boundary phải hiển thị màn hình lỗi có nút tải lại thay vì để crash trắng.
- React Query hook phải chuẩn hóa response trước khi trả về UI: list luôn là array, pagination/progress/stat object luôn có fallback đầy đủ.
- Chart, Table, List, Statistic không được nhận trực tiếp dữ liệu có thể `null`; luôn truyền dữ liệu đã normalize.

## Required Frontend Pattern

API module:

```js
// src/api/questionsApi.js
import { httpClient } from './httpClient'

export const questionsApi = {
  list: async (params = {}) => {
    const { data } = await httpClient.get('/admin/questions', { params })
    return Array.isArray(data) ? data : []
  },
}
```

React Query hook:

```js
// src/hooks/useQuestions.js
import { useQuery } from '@tanstack/react-query'
import { questionsApi } from '../api/questionsApi'

export const useQuestions = (params = {}) =>
  useQuery({
    queryKey: ['questions', 'list', params],
    queryFn: () => questionsApi.list(params),
  })
```

Component:

```jsx
// src/components/questions/QuestionsTable.jsx
import { Table } from 'antd'

export const QuestionsTable = ({ questions = [], loading }) => (
  <Table rowKey="id" dataSource={questions} loading={loading} />
)
```

## Chính sách kiểm tra hiện hành

Theo chỉ đạo người dùng, áp dụng cho các công việc tiếp theo và ưu tiên hơn hướng dẫn kiểm tra cũ trong PLAN/README/báo cáo các giai đoạn:

- **AI không mở hoặc điều khiển browser để test UI**, không chạy DevTools/throttling, không dựng server/bản build QA riêng. Người dùng tự kiểm tra giao diện, responsive, light/dark và Slow 3G. AI chỉ rà soát component/token/breakpoint qua code, chạy lint/unit/build phù hợp và ghi rõ UI thủ công chưa kiểm tra.
- **Không tự tạo database mới** cho test/QA, không clone database, không tự đổi `DB_NAME` hoặc chuyển ứng dụng sang database khác. Khi cần kiểm tra database, dùng DB dev đang cấu hình trong `backend/.env`; không dùng production hoặc dữ liệu thật.
- **Không chạy integration cũ có bước dựng/xóa bảng trên DB dev.** Không gán TEST_* sang DB dev để vượt guard. Không drop/reset schema, migrate/rollback hoặc seed dữ liệu chỉ để chạy test nếu chưa được người dùng giao rõ thao tác đó.
- Mặc định kiểm tra backend bằng syntax + unit test liên quan, frontend bằng unit/lint/build; ưu tiên kiểm tra hẹp, không lặp suite khi không có thay đổi/rủi ro mới.
- Kiểm tra DB dev chỉ chạy luồng đã chứng minh an toàn: đọc không gây tác dụng phụ hoặc fixture có prefix thuộc test, transaction rollback/cleanup chỉ dữ liệu do chính lần test tạo. GET có thể tự chốt lượt hoặc cập nhật phiên nên không mặc định xem mọi GET là chỉ đọc. Không sửa/xóa dữ liệu có sẵn của người dùng.
- Nếu integration hiện có không an toàn cho DB dev, giữ test, báo **SKIP — suite yêu cầu schema rỗng và dựng/xóa bảng; không phù hợp DB dev**, không tự tạo DB thay thế. Không nhận unit test là bằng chứng integration đã pass.
- Kịch bản UI/manual và cURL vẫn cập nhật để người dùng tự chạy. Chỉ thay chính sách này khi người dùng yêu cầu rõ trong phiên sau.

## Automated Test Rules For Every New Feature

Khi tạo mới, sửa đổi, hoặc tối ưu bất kỳ chức năng nào, AI bắt buộc phải tạo hoặc cập nhật test case tương ứng trong cùng một phiên làm việc. Không được chỉ sửa code nghiệp vụ mà bỏ qua test.

### 1. Quy tắc chung

1. **Mỗi thay đổi nghiệp vụ phải có test đi kèm:**
   - Thêm chức năng mới: tạo test mới.
   - Sửa logic cũ: cập nhật test cũ và thêm test chống regression nếu cần.
   - Sửa bug: thêm test tái hiện bug trước hoặc cùng lúc với fix.
   - Đổi hành vi UI/route/permission/API contract: cập nhật test, helper và docs trực tiếp bị ảnh hưởng; chọn cấp kiểm tra theo mục 4. Project không dùng E2E/Playwright.
2. **Không test phá dữ liệu thật:**
   - Kiểm tra database tuân thủ chính sách hiện hành bên trên: dùng DB dev an toàn, không tự tạo database test, không dùng database thật.
   - Dữ liệu test tạo mới phải có prefix rõ ràng: `E2E_`, `e2e_`, hoặc prefix riêng được thống nhất trong test.
   - Không sửa/xóa dữ liệu thật nếu dữ liệu đó không do test tạo ra.
   - Test destructive chỉ áp dụng với dữ liệu prefix do test tạo.
3. **Test phải phản ánh quyền người dùng:**
   - Chức năng có phân quyền phải test ít nhất 2 vai trò: ADMIN và USER (và trường hợp chưa đăng nhập).
   - Integration không tương thích với DB dev thì skip có lý do rõ ràng; không tự dựng DB hoặc bỏ guard để chạy.
4. **Tên test phải viết bằng tiếng Việt dễ hiểu:**
   - Tên test phải mô tả đúng hành vi nghiệp vụ.
   - Tránh tên chung chung như `works`, `test flow`, `should render`.
5. **Test phải ổn định, không phụ thuộc thứ tự chạy:**
   - Không phụ thuộc vào dữ liệu được tạo bởi test khác trừ khi nằm trong cùng test và cùng luồng.
   - Không dùng timeout cứng tùy tiện; test thời gian (hết giờ) điều khiển bằng mốc thời gian truyền vào hoặc cập nhật `expires_at` trong database test.

### 2. Backend API test bắt buộc

Khi thêm hoặc sửa backend API:

1. Cập nhật cURL test trong `backend/curl/<ten_nghiep_vu>.curl`.
2. Mỗi endpoint phải có tối thiểu:
   - Happy path: payload hợp lệ tối thiểu và payload đầy đủ.
   - Validation path: thiếu trường bắt buộc, sai định dạng, sai enum.
   - Permission path: chưa login `401`, không đủ quyền `403`.
3. Nếu sửa logic backend, chạy kiểm tra cú pháp và test trực tiếp liên quan trong `backend/`:

```bash
node --check src/modules/<module>/<file>.js
node --test src/modules/<module>/<file>.test.js
```

   Chạy `pnpm test` khi thay đổi hạ tầng/backend dùng chung có ảnh hưởng rộng hoặc khi các test hẹp phát hiện nguy cơ liên phân hệ.

   Nếu sửa migration hoặc truy vấn database, bổ sung test trực tiếp; chỉ chạy kiểm tra DB dev an toàn theo chính sách hiện hành. Không tự chạy `pnpm test:database` vì suite cũ dựng/xóa schema; ghi rõ phần integration chưa chạy.

4. Nếu API đổi contract mà frontend sử dụng, cập nhật `frontend/src/api/` và hook tương ứng trong cùng phiên.

### 3. Frontend: kiểm tra bắt buộc

Project không dùng E2E/Playwright. Khi thêm hoặc sửa màn hình/component/flow frontend:

1. Logic thuần (chuẩn hóa dữ liệu, tính toán hiển thị, chuyển đổi form/payload) đặt trong `src/utils/` và có unit test `*.test.js` chạy bằng `pnpm test` (`node:test`).
2. Chạy `pnpm lint` và `pnpm build` khi đổi import/JSX/cấu hình.
3. Rà soát checklist giao diện qua code; không mở browser. Cung cấp bước thử để người dùng tự đối chiếu desktop/tablet/mobile, light/dark, ADMIN/USER; báo UI thủ công chưa kiểm.

### 4. Chọn mức kiểm tra theo phạm vi thay đổi

**Mặc định dùng kiểm tra nhẹ nhất đủ chứng minh thay đổi đúng.**

| Thay đổi | Kiểm tra mặc định |
| --- | --- |
| Tài liệu, comment, gom/xóa tài liệu, dọn cache/log | Kiểm tra nội dung/liên kết/file tham chiếu; không chạy lint hoặc build |
| Đổi chữ/nhãn/hướng dẫn, không đổi hành vi | Lint phần liên quan nếu có sửa code; build khi ảnh hưởng import/JSX/cấu hình |
| Xóa file mã nguồn không dùng | Kiểm tra import, test và build |
| Hàm xử lý, validation, hook, API/backend | Unit/integration test trực tiếp liên quan |
| Migration, truy vấn, transaction, khóa dòng, chấm bài, lượt thi | Syntax + unit test liên quan; chỉ kiểm tra DB dev an toàn. Skip suite dựng/xóa schema theo chính sách hiện hành |
| CSS/bố cục, luồng người dùng | Lint/build + unit logic, rà code theo checklist; người dùng tự test UI |
| Đổi cơ chế đăng nhập/phiên, phân quyền, routing toàn ứng dụng | `pnpm test` toàn backend + lint/test/build frontend |

- Hoàn tất các chỉnh sửa liên quan rồi mới chạy nhóm kiểm tra. Khi test hẹp đã pass và không có nguy cơ mới, dừng kiểm tra; không lặp toàn bộ suite chỉ để tăng độ chắc chắn.
- Giảm output để tiết kiệm context: chỉ đọc kết quả tổng hợp và chi tiết của case thất bại.
- Báo rõ đã kiểm tra gì, kết quả và phần không chạy kèm lý do. Không nhận kết quả cũ là xác minh bản sửa mới.
- Giữ test có giá trị; không xóa test bảo mật/nghiệp vụ để giảm thời gian.

### 5. Quy tắc dữ liệu test

1. Fixture DB dev có prefix `E2E_`/`e2e_`, phải rollback/cleanup riêng, không chạm dữ liệu có sẵn; không tự tạo database/schema test.
2. Tên dữ liệu test: tài khoản `e2e_user_`, câu hỏi `E2E_Q_`, đợt kiểm tra `E2E_ROUND_`.
3. Không chạy test trên database có dữ liệu thật.

### 6. Checklist bắt buộc trước khi báo hoàn thành

Trước khi kết luận một chức năng đã xong, AI phải báo rõ:

1. Đã thêm/cập nhật test case nào.
2. Đã chạy lệnh test/build nào.
3. Kết quả pass/fail/skip.
4. Nếu có skip, phải nêu lý do skip.
5. Nếu có lỗi không liên quan do tồn tại sẵn, phải ghi rõ lỗi đó và vì sao không thuộc phạm vi thay đổi.
6. File/log sinh ra khi test chỉ nằm local và không xuất hiện trong phần cần commit.

## Backend Stability & Shared Hosting Optimization Rules

When creating, updating, or maintaining Backend APIs and configurations, the AI must strictly adhere to the following rules to prevent application crashes and resource exhaustion on Shared Hosting (Passenger/cPanel) or restricted environments:

### 1. Bắt buộc bẫy lỗi toàn cục (Global Exception Handling)
* Tất cả các file khởi chạy của ứng dụng (ví dụ: `src/server.js`) bắt buộc phải đăng ký các trình lắng nghe sự kiện toàn cục để tránh sập app đột ngột:
  * `process.on('uncaughtException', ...)`: Dùng để bẫy và ghi log các lỗi đồng bộ nằm ngoài middleware Express.
  * `process.on('unhandledRejection', ...)`: Dùng để bẫy các Promise bị từ chối (reject) mà không có block catch tương ứng.
* Sử dụng `logger.error` từ Winston logger để lưu vết lỗi chi tiết (bao gồm cả call stack) vào file log (`logs/error.log`).

### 2. 100% Async Routes/Controllers phải có Try-Catch
* Không cho phép viết bất cứ hàm Controller hay Middleware bất đồng bộ (`async`) nào mà thiếu block `try-catch`.
* Cú pháp chuẩn bắt buộc:
  ```js
  const myEndpoint = async (req, res, next) => {
    try {
      // Thực hiện logic hoặc kết nối cơ sở dữ liệu
      const data = await db('my_table').select('*');
      return res.json(data);
    } catch (error) {
      // Bắt buộc đẩy lỗi qua next(error) để middleware Express tự động xử lý và log
      return next(error);
    }
  };
  ```
* Tuyệt đối **không viết các block catch rỗng** (`catch (e) {}` không làm gì cả), lỗi bắt buộc phải được đẩy lên `next(error)` hoặc ghi log rõ ràng bằng `logger.error`.

### 3. Giới hạn Connection Pool cực kỳ chặt chẽ (MySQL Pool < 5)
* Trên môi trường Shared Hosting, tài nguyên kết nối đồng thời cực kỳ hạn chế. Cấu hình database trong `knexfile.js` bắt buộc phải đặt giới hạn Pool nhỏ hơn 5 kết nối:
  * `min`: Đặt là `0` hoặc `1`.
  * `max`: Tối đa là `3` (không vượt quá `4`).
  * `idleTimeoutMillis`: Thiết lập thời gian rảnh rỗi tự động ngắt kết nối là `30000` (30 giây) để giải phóng tài nguyên cho hệ thống.

### 4. Tiết kiệm RAM và Tránh Rò Rỉ Bộ Nhớ (Memory Leak)
* Tránh tải toàn bộ cơ sở dữ liệu lớn vào bộ nhớ RAM cùng một lúc. Mọi API trả về danh sách dữ liệu (ví dụ: danh sách tác vụ, nhật ký hoạt động...) bắt buộc phải hỗ trợ **phân trang (Pagination)** sử dụng `limit` và `offset` hoặc giới hạn số lượng bản ghi trả về mặc định tối đa là `50` - `100`.
* Không sử dụng các biến toàn cục (Global variable/array) để lưu trữ cache dữ liệu tạm thời lớn. Mọi tài nguyên tạm (như file upload tạm) phải được xóa ngay sau khi xử lý xong.

## Checklist giao diện

- Tham chiếu layout và component dùng chung; tái sử dụng `glass-card`, pattern bảng/card/drawer và token CSS hiện có.
- Giữ Ant Design, màu primary, radius, typography, khoảng cách và trạng thái loading/empty/error nhất quán.
- Desktop 1440px: bảng và bộ lọc thẳng hàng; tablet 768/1024px: nút không chồng, không tràn ngang; mobile 390px: card đọc được, drawer và footer không vỡ.
- Người dùng tự kiểm light/dark và hai vai trò ADMIN/USER; AI rà code bảo đảm hành động bị ẩn không để lại khoảng trống, không tự mở browser.
- Danh sách: desktop từ 1200px dùng Table; dưới 1200px dùng card xếp dọc. Không tự chuyển desktop thành grid nhiều cột nếu chưa được yêu cầu.
- Modal phải nằm trọn trong viewport, header/footer luôn thấy được; chỉ body cuộn khi nội dung dài. Kiểm tra cả màn hình thấp, không chỉ độ rộng.
- Chọn mức kiểm tra theo mục "Chọn mức kiểm tra theo phạm vi thay đổi"; ưu tiên viewport liên quan. Báo kết quả và các kiểm tra không chạy kèm lý do.
