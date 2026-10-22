const client = require('prom-client');
const { query } = require('./db');

client.collectDefaultMetrics();

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Thoi gian xu ly request HTTP',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
const loginFailures = new client.Counter({
  name: 'app_login_failures_total',
  help: 'So lan dang nhap that bai',
});

// Metric nghiep vu: lay truc tiep tu DB moi lan Prometheus scrape
function dbGauge(name, help, sql) {
  new client.Gauge({
    name, help,
    async collect() {
      try { this.set(Number((await query(sql)).rows[0].v)); } catch (_) { /* bo qua */ }
    },
  });
}
dbGauge('app_apartments_total', 'Tong so can ho', 'SELECT count(*) v FROM apartments');
dbGauge('app_residents_total', 'Tong so cu dan', 'SELECT count(*) v FROM residents');
dbGauge('app_unpaid_fees_total', 'So khoan phi chua thanh toan', "SELECT count(*) v FROM fees WHERE status='unpaid'");
dbGauge('app_open_complaints_total', 'So khieu nai chua xu ly xong', "SELECT count(*) v FROM complaints WHERE status<>'resolved'");

module.exports = { register: client.register, httpDuration, loginFailures };
