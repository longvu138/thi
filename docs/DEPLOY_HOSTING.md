# Hướng dẫn deploy lên Shared Hosting (cPanel)

Triển khai source này trên hosting hỗ trợ Node.js/cPanel: kéo code bằng Git về hosting, Backend chạy bằng **Setup Node.js App** (Passenger), Frontend build ở máy cá nhân rồi đưa lên `public_html`. Không dùng Docker.

Trong tài liệu, thay các giá trị mẫu:

| Mẫu | Ý nghĩa |
|---|---|
| `kiemtra.example.vn` | Tên miền chạy hệ thống |
| `cpuser` | Tên tài khoản cPanel (thư mục `/home/cpuser`) |
| `GITHUB_USER/thi` | Repository chứa source |

---

## 0. Đọc trước: giới hạn của shared hosting

Mục tiêu 1000 người thi đồng thời chưa được xác minh trên hosting này. Shared hosting thường giới hạn:

- **CPU, RAM, Entry Processes (số request xử lý đồng thời)** theo gói (CloudLinux LVE). Vượt giới hạn sẽ trả lỗi **508** hoặc rất chậm.
- **Số kết nối MySQL** mỗi user (`max_user_connections`, thường 10–30).
- Tiến trình Node.js **bị tắt khi không có truy cập** một lúc.

Trước khi chọn gói:

1. Hỏi nhà cung cấp các con số: CPU, RAM, Entry Processes, `max_user_connections` MySQL, có cho chạy Node.js lâu dài không.
2. Xác nhận hosting có MySQL 8, Node.js 24 (hoặc 22 tương thích dependencies), Terminal/SSH và cho chạy một Backend liên tục. Hosting chỉ chạy PHP/static không đủ cho source này.
3. Thử tải nhẹ trên chính hosting (mục 8) **sau khi đã xin phép nhà cung cấp**.
4. Nếu số người thi cùng lúc lớn mà hosting không chịu được: chia ca thi theo đơn vị, hoặc chuyển sang VPS (khi đó dùng `docs/VAN_HANH.md` bản Docker).

---

## 1. Chuẩn bị

- [ ] Tên miền trỏ về hosting; bật **SSL/TLS Status → AutoSSL** để có HTTPS (bắt buộc, cookie đăng nhập cần Secure).
- [ ] cPanel → **MySQL Databases**: tạo database (ví dụ `cpuser_thi`), user (ví dụ `cpuser_thi`), mật khẩu mạnh; gán user vào database với **ALL PRIVILEGES** (cần quyền `CREATE TEMPORARY TABLES` cho báo cáo theo đảng bộ).
- [ ] Source đã đẩy lên GitHub (repository private). File `.env`, PDF, `outputs/` không có trong repository.
- [ ] Dùng SSH deploy key chỉ đọc hoặc cách xác thực Git do hosting hỗ trợ; không nhúng token vào URL clone. Có thể upload source ZIP thay Git, nhưng không upload `.env` local hoặc `node_modules` từ máy Mac.
- [ ] Tạo thêm tên miền API `api-kiemtra.example.vn`, trỏ cùng hosting và bật HTTPS. Hướng dẫn dùng frontend/API ở hai subdomain cùng miền gốc; không cần cấu hình reverse proxy thủ công.

---

## 2. Backend

### 2.1 Kéo source về hosting

cPanel → **Terminal**:

```bash
git clone git@github.com:GITHUB_USER/thi.git ~/repositories/thi
mkdir -p ~/thi-data          # nơi lưu cấu hình đầu mối hỗ trợ và bản sao lưu, ngoài public_html
chmod 700 ~/thi-data
```

### 2.2 Tạo ứng dụng Node.js

cPanel → **Setup Node.js App** → **Create Application**:

| Mục | Giá trị |
|---|---|
| Node.js version | **24.x** (hoặc 22.x đã kiểm tra tương thích) |
| Application mode | Production |
| Application root | `repositories/thi/backend` |
| Application URL | `api-kiemtra.example.vn` tại đường dẫn gốc `/` |
| Application startup file | `src/server.js` |

Bấm **Create**. Backend tự nhận cổng/socket do Passenger cấp, không đặt cứng `PORT`. API trong source đã có tiền tố `/api`, nên không mount ứng dụng thêm vào `/api`. Nếu panel chỉ nhận tên startup file, tạo `backend/app.js` chứa `require('./src/server');` rồi chọn `app.js`. Giữ nguyên `.htaccess` Passenger do panel sinh tại document root của tên miền API.

### 2.3 Tạo file `.env`

File Manager → `repositories/thi/backend` → tạo `.env` (quyền 600). Tạo secret bằng lệnh `openssl rand -hex 32` trong Terminal, **mỗi secret một lần chạy, hai giá trị phải khác nhau**:

```env
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_USER=cpuser_thi
DB_PASSWORD=<mật khẩu MySQL>
DB_NAME=cpuser_thi
# Không vượt max_user_connections của hosting; bắt đầu từ 3, tăng dần sau khi thử tải.
DB_POOL_MIN=0
DB_POOL_MAX=3

JWT_SECRET=<openssl rand -hex 32>
CSRF_SECRET=<openssl rand -hex 32, khác JWT_SECRET>
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=lax

CORS_ALLOWED_ORIGINS=https://kiemtra.example.vn
CORS_ALLOW_SAME_ORIGIN=false
# Ví dụ chỉ đúng nếu nhà cung cấp xác nhận đúng một proxy tin cậy.
# Hỏi nhà cung cấp và thay theo chuỗi proxy thực tế; không mặc định tin mọi proxy.
TRUST_PROXY=1

# Giới hạn request: người đã vào thi tính theo từng người; theo IP để rộng vì nhiều người dùng chung wifi.
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX=30000
CANDIDATE_RATE_LIMIT_WINDOW_MS=900000
CANDIDATE_RATE_LIMIT_MAX=600
PARTICIPANT_RATE_LIMIT_WINDOW_MS=900000
PARTICIPANT_RATE_LIMIT_MAX=3000

ATTEMPT_EXPIRY_JOB_ENABLED=true
ATTEMPT_EXPIRY_INTERVAL_MS=30000
LOAD_TEST_ENABLED=false

APP_SETTINGS_FILE=/home/cpuser/thi-data/settings.json
LOG_LEVEL=info
LOG_RETENTION=30d
```

Các biến còn lại giữ mặc định trong `backend/.env.example`. Không gửi file `.env` qua Zalo/email, không commit.

### 2.4 Cài thư viện, tạo bảng, tạo Admin

Trên trang Setup Node.js App, copy dòng lệnh **"Enter to the virtual environment"** (dạng `source /home/cpuser/nodevenv/repositories/thi/backend/22/bin/activate && cd /home/cpuser/repositories/thi/backend`) rồi chạy trong Terminal:

```bash
source /home/cpuser/nodevenv/repositories/thi/backend/22/bin/activate && cd /home/cpuser/repositories/thi/backend
npx --yes pnpm@10.33.3 install --prod --frozen-lockfile
NODE_ENV=production npm run migrate        # tạo bảng trên database trống
NODE_ENV=production npm run create-admin   # nhập tên đăng nhập, họ tên, mật khẩu Admin
```

- Nếu CloudLinux yêu cầu dùng nút **Run NPM Install**, làm theo hướng dẫn nhà cung cấp (`npm install --omit=dev` không dùng pnpm lockfile). Không chép đè symlink `node_modules` do panel quản lý. Nếu Argon2 không cài được, gửi log cho nhà cung cấp kiểm tra Node/kiến trúc/thư viện hệ thống.
- Mỗi người quản trị một tài khoản riêng.

### 2.5 Khởi động và kiểm tra

Setup Node.js App → **Start App** (hoặc Restart). Kiểm tra:

```bash
curl -s https://api-kiemtra.example.vn/api/health
curl -s https://api-kiemtra.example.vn/api/health/db
```

`/api/health/db` trả 503 → kiểm tra lại `DB_*`, quyền user MySQL.

---

## 3. Frontend

### 3.1 Build ở máy cá nhân

`frontend/.env` hiện đang trỏ `http://localhost:3108/api` — **không dùng file này để build bản chính thức**. Tạo `frontend/.env.production` (đã bị `.gitignore` bỏ qua):

```env
# API trên subdomain riêng, vẫn giữ hậu tố /api.
VITE_API_BASE_URL=https://api-kiemtra.example.vn/api
# Địa chỉ in trên mã QR và trang hướng dẫn.
VITE_PUBLIC_APP_URL=https://kiemtra.example.vn
```

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm build
```

Kiểm tra nhanh đã build đúng: `grep -r "localhost:3108" dist` **không được ra kết quả**.

Nén toàn bộ nội dung **bên trong** `frontend/dist` thành `dist.zip`.

### 3.2 Đưa lên hosting

1. File Manager → document root của `kiemtra.example.vn` (thường `public_html`): upload và giải nén **nội dung** `dist`, để `index.html` nằm ngay tại document root. Không xóa file của website khác. Backend source và `.env` nằm ngoài thư mục này.
2. Tạo `.htaccess` cho **frontend**, không sửa `.htaccess` Passenger của tên miền API:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
<IfModule mod_headers.c>
    <FilesMatch "^index\.html$">
        Header set Cache-Control "no-cache"
    </FilesMatch>
</IfModule>
```

3. Mở `https://kiemtra.example.vn`, vào thi thử; mở `https://kiemtra.example.vn/admin/login`, đăng nhập Admin. Tải lại (F5) ở một trang con như `/exam-rounds` phải không lỗi 404.

---

## 4. Cron job (cPanel → Cron Jobs)

### 4.1 Kiểm tra tiến trình Backend

Nếu Passenger cho ứng dụng ngủ, job tự chốt cũng dừng. Cần nhà cung cấp cấu hình một tiến trình luôn chạy; nhiều tiến trình sẽ có bộ rate-limit trong RAM riêng. Cron gọi health bên dưới chỉ giúp đánh thức/kiểm tra, không đảm bảo tiến trình luôn sống:

```
* * * * * curl -fsS --max-time 20 https://api-kiemtra.example.vn/api/health >/dev/null 2>&1
```

### 4.2 Sao lưu database hằng ngày — bắt buộc

Tạo `~/.my.cnf` (quyền 600) để không ghi mật khẩu trong lệnh cron:

```ini
[client]
user=cpuser_thi
password=<mật khẩu MySQL>
```

Cron chạy 01:30 mỗi ngày (chọn nhận email lỗi cron). Chỉ dọn bản cũ sau khi xác minh backup thành công; giữ ít nhất 14 bản:

```
30 1 * * * /bin/bash -o pipefail -c 'mkdir -p ~/thi-data/backup && mysqldump --single-transaction --quick --no-tablespaces cpuser_thi | gzip > ~/thi-data/backup/thi-$(date +\%Y\%m\%d-\%H\%M).sql.gz'
```

- Mỗi tuần tải ít nhất một bản sao lưu về máy khác (File Manager → Download).
- Trước và sau mỗi ngày thi, chạy tay lệnh trên một lần.
- Script `deploy/backup.sh`, `deploy/restore.sh` dành cho Docker, **không dùng trên hosting**.

### 4.3 Diễn tập khôi phục (làm một lần trước ngày thi)

1. MySQL Databases: tạo database tạm `cpuser_thi_restore`, gán cùng user.
2. Terminal: `gunzip -c ~/thi-data/backup/<file>.sql.gz | mysql cpuser_thi_restore`
3. phpMyAdmin: so số dòng các bảng `users`, `exam_rounds`, `questions`, `attempts` với database chính, rồi xóa database tạm.

---

## 5. Cập nhật phiên bản mới

Không cập nhật trong giờ thi.

1. Sao lưu database (chạy tay lệnh 4.2).
2. cPanel → **Git Version Control** → Manage → **Pull or Deploy** → **Update from Source** (hoặc `git pull` trong `~/repositories/thi`).
3. Nếu `backend/package.json` thay đổi: vào virtual environment, chạy `npm install --omit=dev`.
4. Nếu có migration mới: `NODE_ENV=production npm run migrate`.
5. Khởi động lại Backend: `mkdir -p ~/repositories/thi/backend/tmp && touch ~/repositories/thi/backend/tmp/restart.txt` (hoặc Restart trong Setup Node.js App).
6. Nếu Frontend thay đổi: build lại ở máy (mục 3.1), tải lên `public_html` như mục 3.2.
7. Kiểm tra `/api/health`, `/api/health/db`, vào thi thử một lượt bằng đợt chạy thử.

---

## 6. Xử lý sự cố

| Hiện tượng | Xử lý |
|---|---|
| `Can't acquire lock for app` khi Start/Stop | Dùng Restart trong panel hoặc nhờ nhà cung cấp xử lý đúng ứng dụng; không kill toàn bộ Node hay xóa lock của tài khoản. |
| `/api/health/db` trả 503 | Sai `DB_*`, user chưa gán quyền, hoặc đã hết kết nối MySQL → giảm `DB_POOL_MAX`. |
| Lỗi **508** / trang rất chậm khi đông người | Hết tài nguyên gói hosting (CPU/Entry Processes). Báo nhà cung cấp, nâng gói; trước mắt chia ca. |
| Nhiều lỗi **429** | Giới hạn request quá chặt hoặc `TRUST_PROXY` sai (mọi người bị ghi chung một IP). Kiểm tra IP trong `backend/logs/access-*.log`. |
| Backend không khởi động, log báo secret | `JWT_SECRET`/`CSRF_SECRET` thiếu, ngắn hơn 32 ký tự hoặc trùng nhau; `AUTH_COOKIE_SECURE` phải là `true`. |
| Trang trắng hoặc gọi API `localhost` | Frontend build bằng `frontend/.env` thay vì `.env.production`; build lại theo mục 3.1. |
| F5 ở trang con báo 404 | Thiếu khối rewrite trong `.htaccess` (mục 3.2). |

Log Backend: `~/repositories/thi/backend/logs/` (tự xoay vòng theo `LOG_RETENTION`).

---

## 7. Sau khi deploy xong

Tiếp tục theo `docs/VAN_HANH.md` từ phần chuẩn bị đợt thi: import câu hỏi, cơ cấu đề, kiểm tra cấu hình hai người, chạy thử với nhóm nhỏ, xóa dữ liệu chạy thử, theo dõi hằng ngày và xử lý sự cố. Các phần về Docker, Caddy, `backup.sh` trong `VAN_HANH.md` thay bằng tài liệu này.

---

## 8. Kiểm tra trước khi mở thi

- Dùng đợt chạy thử riêng để kiểm tra: vào cổng → nhập thông tin → bắt đầu → chọn đáp án → nộp → kết quả → in/tra cứu phiếu. Kiểm tra F5 ở trang con và đăng nhập Admin.
- Không chạy `pnpm load-test` trên database thật. Script hiện chỉ chấp nhận database QA `exam_load_test_*` và handshake tương ứng; không bật `LOAD_TEST_ENABLED` trên production để thử cho tiện.
- Nếu cần thử tải, dùng môi trường staging riêng có sự đồng ý của nhà cung cấp. Không coi kết quả local là cam kết sức chứa hosting.

Tham khảo thao tác panel: [cPanel — tạo ứng dụng Node.js qua CloudLinux](https://support.cpanel.net/hc/en-us/articles/1500000004602-How-to-create-a-NodeJS-application-via-CloudLinux). Tên mục có thể khác tùy nhà cung cấp.
