const express = require('express');
const cookieSession = require('cookie-session');
const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { query } = require('./db');
const { register, httpDuration, loginFailures } = require('./metrics');
const log = require('./logger');
const entities = require('./entities');
const crud = require('./crud');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);            // dang dung sau Nginx
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// ---- Do thoi gian request -> Prometheus + ghi access log JSON ----
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const sec = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route ? (req.baseUrl || '') + req.route.path : 'unmatched';
    if (req.path !== '/metrics' && req.path !== '/healthz') {
      httpDuration.labels(req.method, route, String(res.statusCode)).observe(sec);
      log.info('http_request', { method: req.method, path: req.path, status: res.statusCode, ms: Math.round(sec * 1000), ip: req.ip });
    }
  });
  next();
});

app.get('/healthz', async (_req, res) => {
  try { await query('SELECT 1'); res.send('ok'); } catch (_) { res.status(503).send('db down'); }
});
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/static', express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(cookieSession({
  name: 'cc_sess',
  secret: process.env.SESSION_SECRET,
  httpOnly: true, secure: true, sameSite: 'lax', maxAge: 2 * 60 * 60 * 1000,
}));

// ---- CSRF token (luu trong session, kiem tra voi moi POST) ----
app.use((req, res, next) => {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrf = req.session.csrf;
  res.locals.user = req.session.user || null;
  res.locals.menu = Object.entries(entities).map(([k, v]) => ({ key: k, title: v.title }));
  if (req.method === 'POST') {
    const a = Buffer.from(String(req.body._csrf || '')); const b = Buffer.from(req.session.csrf);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      log.warn('csrf_rejected', { path: req.path, ip: req.ip });
      return res.status(403).render('error', { message: 'CSRF token không hợp lệ' });
    }
  }
  next();
});

// ---- Dang nhap ----
const loginLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const username = String(req.body.username || '').slice(0, 50);
    const r = await query('SELECT * FROM users WHERE username = $1', [username]);
    const ok = r.rows.length && await bcrypt.compare(String(req.body.password || ''), r.rows[0].password_hash);
    if (!ok) {
      loginFailures.inc();
      log.warn('login_failed', { username, ip: req.ip });
      return res.status(401).render('login', { error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    req.session = { csrf: crypto.randomBytes(24).toString('hex'), user: username };   // doi session sau khi login
    log.info('login_success', { username, ip: req.ip });
    res.redirect('/');
  } catch (e) { next(e); }
});
app.post('/logout', (req, res) => { req.session = null; res.redirect('/login'); });

app.use((req, res, next) => (req.session.user ? next() : res.redirect('/login')));

app.get('/', async (_req, res, next) => {
  try {
    const r = await query(`SELECT
      (SELECT count(*) FROM apartments) AS apartments,
      (SELECT count(*) FROM residents) AS residents,
      (SELECT count(*) FROM fees WHERE status='unpaid') AS unpaid,
      (SELECT coalesce(sum(amount),0) FROM fees WHERE status='unpaid') AS unpaid_amount,
      (SELECT count(*) FROM complaints WHERE status<>'resolved') AS open_complaints`);
    const notices = (await query('SELECT title, created_at FROM notices ORDER BY id DESC LIMIT 5')).rows;
    res.render('dashboard', { s: r.rows[0], notices });
  } catch (e) { next(e); }
});

app.use('/', crud);

// ---- Xu ly loi ----
app.use((err, req, res, _next) => {
  log.error('unhandled_error', { path: req.path, error: err.message });
  res.status(500).render('error', { message: 'Lỗi hệ thống' });
});

// ---- Khoi dong: tao tai khoan admin lan dau ----
async function boot() {
  const u = process.env.ADMIN_USER || 'admin';
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  for (let i = 0; i < 10; i++) {
    try {
      await query('INSERT INTO users (username, password_hash) VALUES ($1,$2) ON CONFLICT (username) DO NOTHING', [u, hash]);
      break;
    } catch (e) { log.warn('db_not_ready', { error: e.message }); await new Promise((r) => setTimeout(r, 2000)); }
  }
  app.listen(3000, '0.0.0.0', () => log.info('server_started', { port: 3000 }));
}
if (!process.env.SESSION_SECRET || !process.env.ADMIN_PASSWORD) {
  log.error('missing_env', { need: 'SESSION_SECRET, ADMIN_PASSWORD' }); process.exit(1);
}
boot();
