# Hệ thống Quản lý Chung cư / Căn hộ – Triển khai bằng Docker Compose

Đề tài 36 – môn *Triển khai và Quản trị Hệ thống Phần mềm*.

> **Giai đoạn commit 1:** ứng dụng web + PostgreSQL + pgAdmin + Nginx reverse proxy (HTTPS tự ký + security headers).

## Chạy nhanh
```bash
./scripts/gen-env.sh      # tạo .env với mật khẩu ngẫu nhiên mạnh
./scripts/gen-cert.sh     # tạo chứng chỉ HTTPS tự ký
docker compose up -d --build
```
- Website: https://localhost (chấp nhận cảnh báo chứng chỉ tự ký)
- pgAdmin: http://localhost:5050
