// Log dang JSON, ghi ra stdout de Promtail thu thap -> Loki
function write(level, msg, extra = {}) {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra }) + '\n');
}
module.exports = {
  info: (m, e) => write('info', m, e),
  warn: (m, e) => write('warn', m, e),
  error: (m, e) => write('error', m, e),
};
