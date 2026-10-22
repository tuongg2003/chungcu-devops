#!/usr/bin/env bash
# Tao chung chi TLS tu ky cho Nginx (dung cho do an / moi truong lab)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p nginx/certs
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout nginx/certs/server.key -out nginx/certs/server.crt \
  -subj "/C=VN/ST=ThaiNguyen/O=ChungCu/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
chmod 644 nginx/certs/server.crt; chmod 640 nginx/certs/server.key || true
# Container nginx chay user 101 can doc duoc key
chmod 644 nginx/certs/server.key
echo "Da tao nginx/certs/server.crt va server.key"
