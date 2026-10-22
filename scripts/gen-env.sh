#!/usr/bin/env bash
# Sinh file .env voi mat khau ngau nhien manh tu .env.example
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && { echo ".env da ton tai, khong ghi de."; exit 0; }
while IFS= read -r line; do
  if [[ "$line" == *=CHANGE_ME* ]]; then
    echo "${line/CHANGE_ME/$(openssl rand -hex 16)}"
  else
    echo "$line"
  fi
done < .env.example > .env
chmod 600 .env
echo "Da tao .env. Mat khau dang nhap web:"; grep -E '^(ADMIN_USER|ADMIN_PASSWORD)=' .env
