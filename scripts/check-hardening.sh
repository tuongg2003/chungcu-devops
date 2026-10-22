#!/usr/bin/env bash
# Kiem tra nhanh cac bien phap hardening - dung khi demo
cd "$(dirname "$0")/.."
echo "=== 1. User chay trong tung container (khong duoc la root) ==="
for c in cc_app cc_nginx cc_db cc_pgadmin cc_prometheus cc_grafana cc_loki; do
  printf "%-16s -> %s\n" "$c" "$(docker exec $c id 2>/dev/null | cut -d' ' -f1)"
done
echo; echo "=== 2. Cong duoc publish ra host ==="
docker ps --format '{{.Names}}\t{{.Ports}}' | grep '^cc_'
echo; echo "=== 3. Network isolation (internal = khong ra Internet) ==="
for n in frontend backend monitoring; do
  printf "chungcu_%-11s internal=%s\n" "$n" "$(docker network inspect chungcu_$n --format '{{.Internal}}')"
done
echo; echo "=== 4. DB khong publish cong 5432 ra host ==="
(ss -tln 2>/dev/null | grep -q ':5432 ') && echo "CANH BAO: 5432 dang mo" || echo "OK: 5432 khong mo tren host"
echo; echo "=== 5. Quyen cua user ung dung trong PostgreSQL ==="
source .env
docker exec cc_db psql -U "$POSTGRES_SUPER_USER" -d "$DB_NAME" -c "\du"
echo; echo "=== 6. Security headers cua Nginx ==="
curl -skI https://localhost | grep -iE 'strict-transport|x-frame|x-content-type|content-security|referrer|permissions|server'
echo; echo "=== 7. /metrics khong lo ra ngoai ==="
printf "https://localhost/metrics -> HTTP %s\n" "$(curl -sk -o /dev/null -w '%{http_code}' https://localhost/metrics)"
echo; echo "=== 8. Container read-only / cap_drop ==="
docker inspect cc_app cc_nginx --format '{{.Name}} readonly={{.HostConfig.ReadonlyRootfs}} capdrop={{.HostConfig.CapDrop}} secopt={{.HostConfig.SecurityOpt}}'
