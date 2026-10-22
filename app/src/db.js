const { Pool } = require('pg');
const log = require('./logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 10,
  idleTimeoutMillis: 30000,
});
pool.on('error', (e) => log.error('pg_pool_error', { error: e.message }));

module.exports = { pool, query: (text, params) => pool.query(text, params) };
