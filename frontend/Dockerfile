# syntax=docker/dockerfile:1
# FILE NÀY BUILD GIAO DIỆN VÀ ĐÓNG GÓI WEB SERVER.
# Node dùng để build React/Vite; Caddy phục vụ website và chuyển /api sang backend.
ARG NODE_IMAGE=node:24-bookworm-slim
ARG CADDY_IMAGE=caddy:2-alpine
# Giai đoạn 1: cài thư viện và build giao diện.
FROM ${NODE_IMAGE} AS build
# Thư mục làm việc nằm bên trong image.
WORKDIR /app
# Cài đúng phiên bản pnpm giống source.
RUN npm install --global pnpm@10.33.3
# Copy package/lockfile trước để tận dụng cache Docker khi chỉ sửa giao diện.
COPY frontend/package.json frontend/pnpm-lock.yaml ./
# Cài cả devDependencies vì Vite và công cụ build nằm trong nhóm này.
# Danh sách lấy từ package.json, gồm React, Ant Design, React Query và Vite/công cụ build.
RUN pnpm install --frozen-lockfile
# Copy source frontend; các file bị loại bởi .dockerignore không được gửi vào build context.
COPY frontend/ ./
# Website gọi /api cùng địa chỉ đang truy cập, không đóng cứng IP/tên miền server.
ENV VITE_API_BASE_URL=/api
# Biên dịch React/Vite thành file tĩnh HTML/CSS/JS trong /app/dist.
RUN pnpm build

# Giai đoạn 2: image chạy thực tế chỉ cần Caddy và file tĩnh, không cần Node/node_modules.
FROM ${CADDY_IMAGE} AS runtime
COPY --from=build /app/dist /srv
# Caddyfile cấu hình SPA, reverse proxy /api, HTTP/HTTPS và endpoint healthcheck.
COPY deploy/Caddyfile /etc/caddy/Caddyfile
# 80: HTTP, 443: HTTPS, 8080: kiểm tra nội bộ. Compose chỉ public cổng cần thiết.
EXPOSE 80 443 8080
# Không khai báo CMD riêng: dùng lệnh khởi động Caddy có sẵn trong image nền.
