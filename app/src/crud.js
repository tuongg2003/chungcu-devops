const express = require('express');
const { query } = require('./db');
const log = require('./logger');
const entities = require('./entities');

const router = express.Router();

function parseValue(f, raw) {
  if (raw === undefined || raw === '') return null;
  if (f.type === 'number' || f.type === 'ref') {
    const n = Number(raw);
    if (Number.isNaN(n)) throw new Error(`${f.label} không hợp lệ`);
    return n;
  }
  if (f.type === 'bool') return raw === 'true';
  return String(raw).trim().slice(0, 2000);
}

function readBody(ent, body) {
  return ent.fields.map((f) => {
    const v = parseValue(f, body[f.name]);
    if (f.required && v === null) throw new Error(`Thiếu trường bắt buộc: ${f.label}`);
    if (f.type === 'select' && v !== null && !f.options.includes(v)) throw new Error(`${f.label} không hợp lệ`);
    return v;
  });
}

async function refOptions(ent) {
  const out = {};
  for (const f of ent.fields.filter((x) => x.type === 'ref')) {
    const r = await query(`SELECT id, ${f.ref.label} AS label FROM ${f.ref.table} ORDER BY ${f.ref.label}`);
    out[f.name] = r.rows;
  }
  return out;
}

router.param('entity', (req, res, next, name) => {
  const ent = entities[name];
  if (!ent) return res.status(404).render('error', { message: 'Không tìm thấy trang' });
  req.ent = ent; req.entName = name; next();
});

// Danh sach + tim kiem
router.get('/:entity', async (req, res, next) => {
  try {
    const ent = req.ent;
    const refs = ent.fields.filter((f) => f.type === 'ref');
    const joins = refs.map((f) => `LEFT JOIN ${f.ref.table} ${f.name}_t ON ${f.name}_t.id = t.${f.name}`).join(' ');
    const extra = refs.map((f) => `${f.name}_t.${f.ref.label} AS ${f.name}_label`).join(', ');
    const q = (req.query.q || '').toString().slice(0, 100);
    const params = []; let where = '';
    if (q) { params.push(`%${q}%`); where = `WHERE t.${ent.search}::text ILIKE $1`; }
    const sql = `SELECT t.*${extra ? ', ' + extra : ''} FROM ${ent.table} t ${joins} ${where} ORDER BY t.id DESC LIMIT 200`;
    const rows = (await query(sql, params)).rows;
    res.render('list', { ent, name: req.entName, rows, q });
  } catch (e) { next(e); }
});

router.get('/:entity/new', async (req, res, next) => {
  try { res.render('form', { ent: req.ent, name: req.entName, row: {}, refs: await refOptions(req.ent), error: null, action: `/${req.entName}` }); }
  catch (e) { next(e); }
});

router.post('/:entity', async (req, res, next) => {
  const { ent, entName: name } = req;
  try {
    const vals = readBody(ent, req.body);
    const cols = ent.fields.map((f) => f.name);
    await query(`INSERT INTO ${ent.table} (${cols.join(',')}) VALUES (${cols.map((_, i) => '$' + (i + 1)).join(',')})`, vals);
    log.info('entity_created', { entity: name, user: req.session.user });
    res.redirect(`/${name}`);
  } catch (e) {
    if (e.code === '23505' || e.code === '23514' || e.code === '23502' || e.code === '23503' || /bắt buộc|hợp lệ/.test(e.message)) {
      return res.status(400).render('form', { ent, name, row: req.body, refs: await refOptions(ent), error: e.detail || e.message, action: `/${name}` });
    }
    next(e);
  }
});

router.get('/:entity/:id/edit', async (req, res, next) => {
  try {
    const r = await query(`SELECT * FROM ${req.ent.table} WHERE id = $1`, [Number(req.params.id) || 0]);
    if (!r.rows.length) return res.status(404).render('error', { message: 'Không tìm thấy bản ghi' });
    res.render('form', { ent: req.ent, name: req.entName, row: r.rows[0], refs: await refOptions(req.ent), error: null, action: `/${req.entName}/${r.rows[0].id}` });
  } catch (e) { next(e); }
});

router.post('/:entity/:id', async (req, res, next) => {
  const { ent, entName: name } = req;
  const id = Number(req.params.id) || 0;
  try {
    const vals = readBody(ent, req.body);
    const sets = ent.fields.map((f, i) => `${f.name} = $${i + 1}`).join(', ');
    await query(`UPDATE ${ent.table} SET ${sets} WHERE id = $${vals.length + 1}`, [...vals, id]);
    log.info('entity_updated', { entity: name, id, user: req.session.user });
    res.redirect(`/${name}`);
  } catch (e) {
    if (e.code?.startsWith('23') || /bắt buộc|hợp lệ/.test(e.message)) {
      return res.status(400).render('form', { ent, name, row: { ...req.body, id }, refs: await refOptions(ent), error: e.detail || e.message, action: `/${name}/${id}` });
    }
    next(e);
  }
});

router.post('/:entity/:id/delete', async (req, res, next) => {
  try {
    await query(`DELETE FROM ${req.ent.table} WHERE id = $1`, [Number(req.params.id) || 0]);
    log.warn('entity_deleted', { entity: req.entName, id: req.params.id, user: req.session.user });
    res.redirect(`/${req.entName}`);
  } catch (e) { next(e); }
});

// Hanh dong nhanh (vd: danh dau da thu phi)
router.post('/:entity/:id/action/:act', async (req, res, next) => {
  try {
    const act = (req.ent.actions || []).find((a) => a.name === req.params.act);
    if (!act) return res.status(404).render('error', { message: 'Hành động không tồn tại' });
    await query(`UPDATE ${req.ent.table} SET ${act.field} = $1 WHERE id = $2`, [act.value, Number(req.params.id) || 0]);
    log.info('entity_action', { entity: req.entName, id: req.params.id, action: act.name, user: req.session.user });
    res.redirect(`/${req.entName}`);
  } catch (e) { next(e); }
});

module.exports = router;
