# 🏢 Hệ thống Quản lý Chung cư / Căn hộ

**Đề tài 36 – Triển khai và Quản trị Hệ thống Phần mềm.**
Toàn bộ hệ thống (ứng dụng web, CSDL, công cụ quản trị DB, reverse proxy, giám sát, log tập trung) được triển khai bằng **Docker Compose**.

| Thành phần | Công nghệ |
|---|---|
| Web app | Node.js 20 + Express + EJS (quản lý căn hộ, cư dân, phí dịch vụ, thông báo, khiếu nại) |
| Cơ sở dữ liệu | PostgreSQL 16 + **pgAdmin 4** |
| Reverse proxy | Nginx (HTTPS tự ký, security headers, rate-limit) |
| Giám sát | Prometheus + Grafana + cAdvisor + node-exporter + postgres-exporter + nginx-exporter |
| Log tập trung | Loki + Promtail (truy vấn bằng LogQL trên Grafana) |

## 1. Kiến trúc

```
                        Internet / Người dùng
                                │  80/443
                         ┌──────▼──────┐
   [frontend]            │    Nginx    │  HTTPS, headers, rate-limit
   pgAdmin:5050 ─────────┤  (uid 101)  │
   Grafana:3000          └──────┬──────┘
   Prometheus:9090              │
 ───────────────────────────────┼───────────────────────── (backend: internal)
                         ┌──────▼──────┐        ┌────────────┐
                         │  Node app   │───────▶│ PostgreSQL │◀── pgAdmin
                         │ (user node) │        └─────▲──────┘
                         └──────┬──────┘              │
 ───────────────────────────────┼─────────────────────┼─── (monitoring: internal)
   Prometheus ◀── /metrics ─────┘     postgres-exporter┘   cAdvisor, node-exporter,
   Grafana ◀── Prometheus + Loki ◀── Promtail ◀── docker logs   nginx-exporter
```

Ba mạng Docker: `frontend` (ra ngoài), `backend` (**internal** – app ↔ db), `monitoring` (**internal** – exporters, Loki). **DB không publish port ra host.**

## 2. Yêu cầu
Docker Engine ≥ 24 + Docker Compose v2, `openssl`, `git`. Chạy tốt trên Ubuntu/Debian (VM hoặc WSL2 có Docker).

## 3. Cài đặt & chạy
```bash
git clone https://github.com/<MSSV>/chungcu-devops.git && cd chungcu-devops

./scripts/gen-env.sh        # tạo .env với mật khẩu ngẫu nhiên 32 ký tự hex (không commit lên Git)
./scripts/gen-cert.sh       # tạo chứng chỉ HTTPS tự ký vào nginx/certs/
docker compose up -d --build
docker compose ps           # tất cả phải Up / healthy
```
`.env` đã khai báo `COMPOSE_FILE` nên lệnh `docker compose` tự gộp 3 file:
`docker-compose.yml` (core) + `docker-compose.monitoring.yml` + `docker-compose.logging.yml`.
> Nếu chạy trên Windows (không phải WSL), đổi dấu `:` trong `COMPOSE_FILE` thành `;`.

### Địa chỉ truy cập
| Dịch vụ | URL | Tài khoản |
|---|---|---|
| Website | https://localhost | `ADMIN_USER` / `ADMIN_PASSWORD` trong `.env` |
| pgAdmin | http://localhost:5050 | `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` |
| Grafana | http://localhost:3000 | `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` |
| Prometheus | http://localhost:9090 (Status → Targets) | không |

Các cổng quản trị mặc định chỉ bind `127.0.0.1`. Nếu demo từ máy khác, đặt `ADMIN_BIND=0.0.0.0` trong `.env` rồi `docker compose up -d`, hoặc dùng SSH tunnel: `ssh -L 3000:localhost:3000 -L 5050:localhost:5050 user@server`.

**Kết nối pgAdmin → PostgreSQL:** server `ChungCu DB` đã được nạp sẵn; khi hỏi mật khẩu nhập `APP_DB_PASSWORD` (user `chungcu_app`). Muốn toàn quyền (xem `\du`, tạo bảng) dùng user `POSTGRES_SUPER_USER`, host `db`, port `5432`.

## 4. Chức năng ứng dụng
Đăng nhập (bcrypt, session cookie `HttpOnly/Secure/SameSite`, CSRF token, giới hạn 10 lần/phút) → Dashboard tổng quan → CRUD **Căn hộ**, **Cư dân**, **Phí dịch vụ** (nút "Đã thu"), **Thông báo**, **Khiếu nại** (nút "Đã xử lý"), tìm kiếm. Dữ liệu mẫu nạp tự động từ `db/init/04-seed.sql`.

## 5. Lịch sử commit (theo yêu cầu đề)
| Commit | Nội dung |
|---|---|
| 1 | Ứng dụng + PostgreSQL + pgAdmin + Nginx reverse proxy (HTTPS, security headers) |
| 2 | Prometheus + Grafana (+ exporters, dashboard giám sát) |
| 3 | Loki + Promtail (+ dashboard log, datasource Loki) |
| 4 | README đầy đủ + script kiểm tra hardening |

## 6. Giám sát (Prometheus + Grafana)
Vào Grafana → *Dashboards → Chung cu*:
- **Chung cu - Giam sat he thong**: container (CPU/RAM), web (req/s, p95, mã lỗi), Nginx (kết nối, req/s), PostgreSQL (connections, TPS, dung lượng), host, metric nghiệp vụ (phí chưa thu, khiếu nại đang mở).
- Kiểm tra Prometheus: *Status → Targets* – 6 job (`app, nginx, postgres, cadvisor, node, prometheus`) phải **UP**.
- Có thể import thêm dashboard cộng đồng: 1860 (Node Exporter), 14282 (cAdvisor), 9628 (PostgreSQL), 12708 (NGINX exporter).

Tạo tải để thấy biểu đồ chuyển động:
```bash
for i in $(seq 1 200); do curl -sk -o /dev/null https://localhost/login; done
```

## 7. Log tập trung (Loki + LogQL)
Grafana → *Explore* → datasource **Loki**. Nhãn có sẵn: `service`, `container`, `stream`.

```logql
# 1) Toàn bộ log ứng dụng
{service="app"}

# 2) Request Nginx lỗi (4xx/5xx) – log Nginx là JSON
{service="nginx"} | json | status >= 400

# 3) Số request Nginx mỗi phút theo mã trạng thái
sum by (status) (count_over_time({service="nginx"} | json [1m]))

# 4) Sự kiện đăng nhập thất bại của ứng dụng (phát hiện dò mật khẩu)
{service="app"} | json | msg="login_failed"

# 5) Lỗi trong PostgreSQL
{service="db"} |~ "(?i)error|fatal"

# 6) Tốc độ log theo từng service
sum by (service) (rate({service=~".+"}[1m]))
```
Dashboard **Chung cu - Log tap trung (Loki)** đã dựng sẵn các truy vấn trên.
Tạo log mẫu: đăng nhập sai vài lần, mở trang không tồn tại (`https://localhost/abc`).

## 8. Hardening đã áp dụng
| # | Biện pháp | Nơi cấu hình |
|---|---|---|
| 1 | **Non-root container**: app chạy `USER node`; Nginx dùng `nginx-unprivileged` (uid 101); Postgres/pgAdmin/Prometheus/Grafana/Loki dùng user riêng của image | `app/Dockerfile`, `docker-compose.yml` |
| 2 | **Network isolation**: `backend`/`monitoring` là `internal: true`; DB không publish port | `networks:` trong compose |
| 3 | **Mật khẩu mạnh**: sinh ngẫu nhiên bằng `openssl rand`, lưu `.env` (chmod 600, nằm trong `.gitignore`); admin web băm bcrypt cost 12 | `scripts/gen-env.sh` |
| 4 | **Hạn chế quyền DB**: user app không phải superuser, chỉ DML; không sửa/xóa bảng `users`; user `exporter` chỉ có `pg_monitor`; thu hồi quyền `PUBLIC` | `db/init/01-roles.sh`, `03-grants.sh` |
| 5 | **Security headers Nginx**: HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy; ẩn version (`server_tokens off`) | `nginx/conf.d/default.conf` |
| 6 | **HTTPS**: TLS 1.2/1.3, tự động chuyển hướng HTTP→HTTPS | `nginx/conf.d/default.conf` |
| 7 | **Giảm đặc quyền container**: `cap_drop: ALL`, `no-new-privileges`, `read_only` rootfs (app, nginx), giới hạn RAM/PIDs | `docker-compose*.yml` |
| 8 | **Rate-limit**: Nginx (10 req/phút cho `/login`) + express-rate-limit | Nginx + `server.js` |
| 9 | **Bảo vệ ứng dụng**: truy vấn tham số hóa (chống SQL Injection), CSRF token, whitelist tên cột, cookie `HttpOnly/Secure/SameSite` | `app/src/` |
| 10 | **Không lộ endpoint nội bộ**: `/metrics` bị chặn từ ngoài (404), `stub_status` chỉ trong mạng nội bộ; cổng pgAdmin/Grafana/Prometheus chỉ bind 127.0.0.1 | Nginx, compose |

Kiểm tra nhanh khi demo: `./scripts/check-hardening.sh`

> Ghi chú đánh đổi: `cAdvisor`, `node-exporter`, `Promtail` cần mount hệ thống tệp/Docker socket ở chế độ **read-only** để thu thập dữ liệu – đây là ngoại lệ có chủ đích, được cô lập trong mạng `monitoring` (internal) và không publish cổng.

## 9. Lệnh vận hành thường dùng
```bash
docker compose ps
docker compose logs -f app nginx
docker compose restart app
docker compose down            # dừng, giữ dữ liệu
docker compose down -v         # dừng và XÓA dữ liệu (volume)
docker exec -it cc_db psql -U $POSTGRES_SUPER_USER -d chungcu
# Backup DB
docker exec cc_db pg_dump -U $POSTGRES_SUPER_USER chungcu > backup_$(date +%F).sql
```

## 10. Xử lý sự cố
| Hiện tượng | Cách xử lý |
|---|---|
| Nginx không khởi động: thiếu `server.crt` | Chạy `./scripts/gen-cert.sh` |
| Nginx `permission denied` đọc key | `chmod 644 nginx/certs/server.key` (đã làm trong script) |
| Prometheus target `cadvisor` DOWN / thiếu nhãn `name` | Thường gặp trên Docker Desktop/WSL2; chạy trên Linux VM hoặc xem metric theo `id` |
| Không đăng nhập được pgAdmin | Email phải hợp lệ (vd `admin@chungcu.vn`) |
| Sửa `ADMIN_PASSWORD` nhưng vẫn đăng nhập mật khẩu cũ | Tài khoản admin chỉ tạo lần đầu; `docker compose down -v` để khởi tạo lại |
| Đổi mật khẩu DB trong `.env` không có hiệu lực | Init script chỉ chạy lần đầu; `docker compose down -v` rồi `up` lại |
| Cổng 80/443 bị chiếm | Dừng dịch vụ đang dùng cổng hoặc sửa mapping `ports` của `nginx` |
