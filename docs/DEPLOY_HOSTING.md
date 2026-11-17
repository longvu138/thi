# Deploy lên Shared Hosting bằng Git — Backend trước

Viết theo quy trình NTDLS bạn cung cấp: clone trực tiếp vào `~/tracnghiem`, chạy `~/tracnghiem/backend`, pull tại `~/tracnghiem` rồi restart. Đã đối chiếu source hệ thống thi hiện tại. Dùng cPanel Terminal, Git Version Control và Setup Node.js App (Passenger); không dùng Docker hoặc PM2.

## Địa chỉ và thư mục dùng trong hướng dẫn

| Mục | Giá trị |
|---|---|
| Website | `https://tracnghiem.ntdls.io.vn` |
| API | `https://tracnghiem.ntdls.io.vn/api` — cùng tên miền |
| Tài khoản hosting | `mvcmkxiu` |
| Git repository | `https://github.com/longvu138/thi.git` |
| Source sau clone | `/home/mvcmkxiu/tracnghiem` |
| Application root Backend | `tracnghiem/backend` |
| Startup file | `src/server.js` |
| Document root Frontend | Xem trong cPanel → Domains → `tracnghiem.ntdls.io.vn` |

Giữ website chính `ntdls.io.vn` và ứng dụng NTDLS hiện có. Chỉ upload Frontend vào document root riêng của `tracnghiem.ntdls.io.vn`, không mặc định dùng `public_html` của website chính.

Thứ tự: **tạo DB → clone source → tạo Node.js App → env → cài thư viện/migrate/Admin → thử Postman → build/upload Frontend → thử một lượt**. Chỉ chuyển sang Frontend khi Backend đã đạt bước 1.7.

## PHẦN 1. BACKEND

### Bước 1.1. Tạo MySQL và bật HTTPS

1. cPanel → Domains: trỏ `tracnghiem.ntdls.io.vn` vào thư mục riêng, ghi lại document root.
2. SSL/TLS Status → bật SSL/AutoSSL cho subdomain này.
3. MySQL Database Wizard: tạo **database trống cho hệ thống thi**, ví dụ `mvcmkxiu_thi`.
4. Tạo MySQL user riêng, gán vào database và cấp quyền. Cần quyền tạo bảng/index/foreign key để migrate, và `CREATE TEMPORARY TABLES` để báo cáo hoạt động. Wizard có thể dùng ALL PRIVILEGES trên đúng database này.
5. Ghi lại DB_HOST do hosting cung cấp, DB_USER, DB_PASSWORD, DB_NAME đầy đủ prefix. Không dùng database của NTDLS.

Hosting cần MySQL 8 và hỗ trợ Node.js. Hướng dẫn dùng Node **22.x** như môi trường bạn đang có; có thể dùng 24.x nếu hosting hỗ trợ. Không dùng bản 18/20 của tài liệu NTDLS cũ cho source này khi chưa kiểm tra dependencies.

### Bước 1.2. Repository public — không cần token/key

Repository `https://github.com/longvu138/thi.git` là public. Clone và pull bằng HTTPS trực tiếp, không cần GitHub token, SSH key hoặc đăng nhập GitHub trên hosting.

Dùng URL không chứa thông tin xác thực:

```text
https://github.com/longvu138/thi.git
```

### Bước 1.3. Clone source vào đúng vị trí

Cài mới khi `~/tracnghiem` chưa tồn tại: mở cPanel → Terminal, chạy từ thư mục home. Nếu đã có cấu trúc như log bạn gửi, **bỏ qua lệnh clone** và làm nhánh “đã clone lồng” bên dưới:

```bash
cd ~
git clone https://github.com/longvu138/thi.git ~/tracnghiem
cd ~/tracnghiem/backend
pwd
ls
```

Kết quả cần thấy:

```text
/home/mvcmkxiu/tracnghiem/backend
package.json  pnpm-lock.yaml  knexfile.js  src  scripts  ...
```

Clone cả repository, không clone URL dạng `.../tree/master/backend`. Đường dẫn đó là trang xem thư mục trên GitHub, không phải Git repository.

**Nếu đã clone lồng đúng như log bạn gửi** (`~/tracnghiem/backend/thi`):

Không clone thêm. Nếu thư mục `~/tracnghiem` chỉ chứa thư mục placeholder của ứng dụng thi và repo lồng như log, dừng riêng app thi trên panel rồi sắp lại như dưới. Các thư mục backup/tạm phải chưa tồn tại; nếu đã tồn tại thì dừng để kiểm tra, không ghi đè.

```bash
# Thoát Node environment nếu đang kích hoạt: deactivate
cd ~
test ! -e ~/thi-source-tmp && test ! -e ~/tracnghiem-panel-backup && \
  mv ~/tracnghiem/backend/thi ~/thi-source-tmp && \
  mv ~/tracnghiem ~/tracnghiem-panel-backup && \
  mv ~/thi-source-tmp ~/tracnghiem

cd ~/tracnghiem/backend
pwd
ls
mkdir -p tmp
```

Source thực tế giờ nằm tại `~/tracnghiem/backend`; thư mục placeholder cũ còn nguyên trong `~/tracnghiem-panel-backup`, không bị xóa. Kiểm tra lại Save cấu hình Node.js App ở bước sau để Passenger trỏ đúng source mới. Nếu trước đó đã có `.env`/cấu hình hosting trong placeholder, giữ bản backup và đối chiếu trước khi tạo mới; không chép đè cấu hình của NTDLS.

Nếu `~/tracnghiem` đã là repo đúng và có `backend/package.json`, bỏ qua cả bước clone/sắp lại; dùng `git pull --ff-only` như phần cập nhật.

### Bước 1.4. Tạo hoặc sửa ứng dụng Node.js trong cPanel

cPanel → Setup Node.js App → Create Application (hoặc sửa ứng dụng thi đã tạo):

| Trường | Điền |
|---|---|
| Node.js version | `22.x` |
| Application mode | `Production` |
| Application root | `tracnghiem/backend` |
| Application URL: domain | `tracnghiem.ntdls.io.vn` |
| Application URL: path | `/api` |
| Application startup file | `src/server.js` |

Bấm Create/Save. Nếu panel không cho đổi Application root của app cũ, nhờ hosting gắn lại ứng dụng thi vào đường dẫn mới; không sửa ứng dụng NTDLS.

Dùng **lệnh kích hoạt Node do panel hiển thị**. Với Application root `tracnghiem/backend`, lệnh bạn đã gửi trỏ vào `nodevenv/tracnghiem/backend/22` là đúng:

Lệnh kích hoạt theo đường dẫn của bạn:

```bash
source /home/mvcmkxiu/nodevenv/tracnghiem/backend/22/bin/activate
cd /home/mvcmkxiu/tracnghiem/backend
```

Dùng đường dẫn thực tế trên panel nếu khác ví dụ. Chạy `node -v` và `pwd` để xác nhận.

Source nhận PORT số hoặc Unix socket do Passenger cấp, **không đặt cứng `PORT=3008` của NTDLS**. Nếu panel chỉ chấp nhận startup file ngay thư mục gốc, tạo `backend/app.js` trên hosting chứa:

```js
require('./src/server');
```

Rồi chọn startup file `app.js`.

### Bước 1.5. Tạo `.env` Backend

Trong Terminal đang ở `~/tracnghiem/backend`:

```bash
cp .env.prod.example .env
chmod 600 .env
openssl rand -hex 32
openssl rand -hex 32
```

Chỉ copy khi **chưa có `.env`**. Hai lần chạy openssl tạo hai secret riêng. Mở File Manager → Settings → Show Hidden Files để sửa `.env`:

```env
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_USER=mvcmkxiu_thi
DB_PASSWORD=<MAT_KHAU_MYSQL_DA_TAO>
DB_NAME=mvcmkxiu_thi
DB_POOL_MIN=0
DB_POOL_MAX=3

JWT_SECRET=<KET_QUA_OPENSSL_THU_NHAT>
CSRF_SECRET=<KET_QUA_OPENSSL_THU_HAI>
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=lax

CORS_ALLOWED_ORIGINS=https://tracnghiem.ntdls.io.vn
CORS_ALLOW_SAME_ORIGIN=true
LOAD_TEST_ENABLED=false
```

Thay các giá trị mẫu. Hai secret phải khác nhau và tối thiểu 32 ký tự; Backend từ chối secret mẫu/không hợp lệ ở production. Nếu mật khẩu có khoảng trắng hoặc dấu `#`, đặt giá trị trong dấu nháy kép đúng cú pháp dotenv.

**IP/proxy:** hỏi hosting chuỗi proxy tin cậy. Nếu họ xác nhận đúng một proxy phía trước, thêm `TRUST_PROXY=1`. Nếu khác, dùng cấu hình số hop/địa chỉ do họ cung cấp; không tự dùng `true` để tin mọi nguồn.

Pool 3 dùng để bắt đầu trên shared hosting. Nếu cần tùy chỉnh timeout, source này dùng tên có hậu tố `_MS`: `DB_CONNECT_TIMEOUT_MS`, `DB_POOL_ACQUIRE_TIMEOUT_MS`, `DB_POOL_CREATE_TIMEOUT_MS`, `DB_POOL_IDLE_TIMEOUT_MS`. Không copy các tên timeout khác của NTDLS vì source sẽ không đọc chúng.

Không copy `.env` local lên hosting, không commit secret. Nếu cùng một biến đã khai báo ở Environment Variables trong cPanel thì giữ đồng nhất với `.env`: biến từ môi trường tiến trình được ưu tiên.

### Bước 1.6. Cài thư viện, migrate và tạo Admin

Sau khi kích hoạt Node environment mới ở bước 1.4:

```bash
cd ~/tracnghiem/backend
npx --yes pnpm@10.33.3 install --prod --frozen-lockfile
```

Nếu hosting bắt buộc dùng nút Run NPM Install, dùng theo panel hoặc `npm install --omit=dev`; cách npm này không sử dụng pnpm lockfile. Không upload `node_modules` từ máy Mac, không chép đè symlink `node_modules` do CloudLinux quản lý.

Kiểm tra `.env` đang trỏ đúng database thi mới ở bước 1.1, rồi chạy:

```bash
NODE_ENV=production npm run migrate
NODE_ENV=production npm run create-admin
```

- Migrate tạo bảng trên database mới, không import dữ liệu test local.
- Lệnh create-admin hỏi thông tin Admin và mật khẩu; không có tài khoản/mật khẩu mặc định.
- Nếu migrate thất bại, dừng và xử lý lỗi trước, không chạy rollback/reset/drop để thử trên DB có dữ liệu.

Sau đó cPanel → Setup Node.js App → Start App/Restart.

### Bước 1.7. Thử Backend bằng Postman — chưa cần Frontend

Tạo hai request GET, không body, không đăng nhập:

| URL | Cần đạt |
|---|---|
| `https://tracnghiem.ntdls.io.vn/api/health` | HTTP 200 |
| `https://tracnghiem.ntdls.io.vn/api/health/db` | HTTP 200 |

Hoặc Terminal:

```bash
curl -i https://tracnghiem.ntdls.io.vn/api/health
curl -i https://tracnghiem.ntdls.io.vn/api/health/db
```

- 404: kiểm tra Application URL `/api`, startup file và Passenger. Express trong source đã có router `/api`; địa chỉ bên ngoài phải là `/api/health`, không phải `/api/api/health`. Nếu hosting thay đổi tiền tố đường dẫn khi chuyển vào Node, nhờ nhà cung cấp kiểm tra cấu hình sub-URI.
- 503 ở health/db: kiểm tra DB_HOST, tên/user/password đầy đủ prefix, quyền user và giới hạn kết nối MySQL.
- 500 hoặc không start: xem log Passenger và `backend/logs`; lưu requestId để đối chiếu. Không gửi secret trong log hỗ trợ.

**Chỉ tiếp tục phần 2 khi cả hai trả HTTP 200.** Postman chưa xác minh được cookie/CORS trên trình duyệt. Passenger có yêu cầu cấu hình theo framework khi chạy dưới đường dẫn con: [tài liệu Node.js chính thức](https://www.phusionpassenger.com/docs/advanced_guides/deployment_and_scaling/apache/deploy/node/).

## PHẦN 2. FRONTEND — chỉ làm sau khi Backend chạy

### Bước 2.1. Build trên máy cá nhân

Tại source trên máy của bạn, tạo hoặc sửa `frontend/.env.production`:

```env
VITE_API_BASE_URL=/api
VITE_PUBLIC_APP_URL=https://tracnghiem.ntdls.io.vn
```

`/api` dùng đúng cùng tên miền website, không cần subdomain API riêng. `.env.production` này khác file production của Backend, chỉ có URL công khai.

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm build
```

Chạy trong thư mục `frontend`, không chạy `pnpm build` ở gốc repo. Nén **nội dung bên trong** `frontend/dist` thành `dist.zip`.

### Bước 2.2. Upload vào đúng document root của subdomain

1. cPanel → Domains → xem document root của `tracnghiem.ntdls.io.vn`.
2. File Manager → đúng thư mục đó → upload và giải nén dist.zip. `index.html` và `assets/` nằm ngay tại document root.
3. Không upload đè `public_html` đang phục vụ NTDLS; không xóa thư mục `api` hoặc `.htaccess` do cPanel sinh.
4. Backend source, `.env`, `.git` và `node_modules` vẫn ở ngoài document root frontend.

### Bước 2.3. `.htaccess` cho Frontend và API cùng domain

**Giữ nguyên khối Passenger do Setup Node.js App sinh**, đặc biệt Application root, Node binary và BaseURI `/api`. Không copy khối NTDLS đang trỏ `/home/mvcmkxiu/ntdls/backend` vào ứng dụng thi.

Tại document root frontend, bổ sung phần sau bên dưới cấu hình hosting hiện có:

```apache
# GIỮ NGUYÊN các khối Passenger/SSL/hosting đã có ở phía trên.
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # API để Passenger xử lý, không trả index.html của React.
    RewriteRule ^api(?:/|$) - [L]

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

Phần rewrite **không tự khởi động Backend**. Node.js App và cấu hình Passenger ở `/api` vẫn phải được tạo trước. Nếu đang có SPA fallback cũ, sửa đúng khối đó để dòng bỏ qua `/api` đứng trước fallback, không chỉ nối thêm một khối sau rule đã chặn API. Không tự tạo lại Passenger config thiếu đường dẫn Node binary; dùng cấu hình panel sinh hoặc nhờ hosting kiểm tra.

### Bước 2.4. Thử Frontend gọi Backend

1. Mở `https://tracnghiem.ntdls.io.vn/admin/login`, đăng nhập Admin vừa tạo.
2. Mở Đợt kiểm tra, tạo đợt Nháp, thêm/import câu, lưu cơ cấu và cấu hình thời gian.
3. Dùng cửa sổ riêng ở `https://tracnghiem.ntdls.io.vn/`: nhập thông tin → Vào thi → chọn câu → nộp → kết quả → Lưu/In phiếu → ảnh/PDF/tra cứu mã. Dùng đợt và thông tin thử riêng trước ngày thi.
4. F5 tại URL con như `/admin/exam-rounds/<id>` hoặc kết quả không được 404.
5. Network phải gọi `https://tracnghiem.ntdls.io.vn/api/...`; không gọi localhost. Nếu Postman đạt nhưng browser lỗi, kiểm tra cookie Secure, HTTPS, CORS, `.htaccess` và cache bản Frontend cũ.

Không mở thi chính thức trước khi hoàn thành một vòng trên hosting. Đặc biệt tự kiểm điện thoại/Zalo, ảnh/PDF và bản in A4; kiểm tra code local không chứng minh các thao tác này đã chạy trên hosting.

## PHẦN 3. PULL CODE VÀ RESTART GIỐNG NTDLS

Không cập nhật trong giờ thi. Sao lưu database bằng chức năng hosting/phpMyAdmin hoặc công cụ MySQL trước khi cập nhật; không ghi đè `.env` của hosting bằng bản local.

### Cách A. Terminal

```bash
cd ~/tracnghiem
git status --short
git pull --ff-only
```

Nếu có thay đổi source trên hosting, xử lý chênh lệch trước khi pull; không dùng `git reset --hard` hoặc xóa `.env` để vượt lỗi. `.env` không thuộc Git.

Kích hoạt Node environment do panel hiển thị rồi:

```bash
cd ~/tracnghiem/backend
npx --yes pnpm@10.33.3 install --prod --frozen-lockfile
# Chỉ khi phiên bản mới có migration cần áp dụng:
NODE_ENV=production npm run migrate
mkdir -p tmp
touch tmp/restart.txt
```

Có thể dùng Restart App trên panel thay `touch`. Backend chạy trực tiếp từ thư mục repository nên code pull về chính là source ứng dụng dùng. Nếu Frontend thay đổi, build lại trên máy và upload dist mới; Git pull/restart Backend không tự build hay cập nhật Frontend.

### Cách B. Git Version Control của cPanel

1. cPanel → Git Version Control: chọn repo `/home/mvcmkxiu/tracnghiem` → Manage → Pull or Deploy → **Update from Remote** (một số giao diện ghi Update from Source).
2. Nếu clone bằng Terminal mà repo chưa hiện trong panel, dùng Create/Add existing repository để đăng ký repo sẵn có, hoặc tiếp tục Cách A; không clone lồng thêm lần nữa.
3. Cài lại dependencies khi cần, migrate khi có migration mới, rồi Restart App hoặc `touch backend/tmp/restart.txt` như trên.

Cách này không cần tự động Deploy HEAD Commit hoặc `.cpanel.yml` vì Application root trỏ trực tiếp vào source repo. Update from Remote là kéo code; Deploy HEAD Commit là tác vụ triển khai riêng của cPanel: [hướng dẫn Git Version Control](https://docs.cpanel.net/cpanel/files/git-version-control/), [hướng dẫn deployment](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-deployment/).

Sau cập nhật, kiểm lại hai health API và một vòng cơ bản trên dữ liệu thử phù hợp. Không import lại DB local hay reset schema có dữ liệu.

## PHẦN 4. XỬ LÝ LỖI THƯỜNG GẶP

### Clone xong chỉ thấy public/src/tmp, thiếu package.json

Bạn đang đứng ở root ứng dụng placeholder hoặc clone bị lồng. Source đúng theo tài liệu là `~/tracnghiem/backend`. Kiểm tra `pwd`, `ls`, Application root và dòng kích hoạt Node. Không clone URL `/tree/master/backend`; không clone lại khi repo đã có.

### `'abrt-cli status' timed out`

Trong log bạn gửi, lệnh này không ngăn Git clone thành công. Kiểm tra tiếp `pwd`/source đúng vị trí. Nếu Terminal thường xuyên treo hoặc Node không chạy, gửi lỗi cho hosting kiểm tra môi trường tài khoản; không sửa dịch vụ hệ điều hành từ source ứng dụng.

### `Can't acquire lock for app`

Khác tài liệu NTDLS cũ: **không chạy `pkill -f node`, `killall -9 node` hoặc xóa hàng loạt lock**. Tài khoản này còn ứng dụng NTDLS; các lệnh đó có thể dừng cả website đang chạy.

1. Ghi lại tên ứng dụng thi và thời điểm lỗi, kiểm tra log Passenger/Node.
2. Thử thao tác riêng ứng dụng thi trong Setup Node.js App, không bấm Start/Stop liên tục.
3. Nếu vẫn kẹt lock, nhờ hosting giải phóng lock/tiến trình của đúng Application root `tracnghiem/backend`. Không có một lệnh xóa lock chung an toàn cho mọi phiên bản CloudLinux.

### Các lỗi khác

| Hiện tượng | Kiểm tra |
|---|---|
| Argon2 cài lỗi | Node/kiến trúc/thư viện hệ thống; gửi log install cho hosting. Không dùng node_modules từ Mac. |
| Backend báo secret không hợp lệ | Hai secret chưa thay, ngắn hoặc trùng; dùng hai kết quả openssl riêng. |
| API trả HTML giao diện thay JSON | SPA rewrite bắt `/api`; đặt rule bỏ qua API trước fallback và kiểm tra Passenger. |
| API 404 | Mount `/api`/BaseURI/startup; không thêm thành `/api/api`. |
| API DB 503 | DB_HOST, prefix tài khoản, quyền và pool MySQL. |
| Đăng nhập xong mất phiên | HTTPS/cookie/CORS; giữ frontend và API cùng domain đã cấu hình. |
| Trang trắng/refresh 404 | Dist build đúng env và `.htaccess` tại document root subdomain. |
| 429 | Rate limit hoặc TRUST_PROXY chưa đúng; đối chiếu IP log với cấu hình nhà cung cấp. |
| 508/chậm khi đông người | Giới hạn CPU/RAM/entry processes/kết nối của gói hosting; chưa có bằng chứng chịu 1000 người đồng thời. |

## Trước ngày thi

- Nhà cung cấp cần xác nhận Backend chạy liên tục, một instance. Passenger ngủ thì job tự chốt không chạy đúng nhịp; nhiều instance có rate limit trong RAM riêng. Không coi cron ping health là bảo đảm tiến trình luôn chạy.
- Thiết lập backup MySQL hằng ngày và thử khôi phục theo công cụ hosting trên DB phù hợp; không dùng script backup/restore Docker cho hosting.
- Không bật LOAD_TEST_ENABLED hoặc chạy load-test trên DB thật. Muốn đo sức tải, dùng staging riêng và có sự đồng ý của nhà cung cấp; số liệu local không phải số liệu hosting.

Hướng dẫn này được rà theo source và tài liệu tham chiếu; **chưa thao tác trực tiếp trên tài khoản hosting của bạn**. Từng bước có mốc kiểm tra để xác nhận trước khi đi tiếp.
