const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  min: env.db.poolMin,
  max: env.db.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error', err);
});

const IDENTIFIER_RE = /^[a-z_][a-z0-9_]*$/;

const quoteIdentifier = (identifier) => {
  const value = String(identifier || '');
  if (!IDENTIFIER_RE.test(value) || value.length > 63 || value === 'public') {
    throw new Error(`Invalid database identifier: ${value || '<empty>'}`);
  }
  return `"${value}"`;
};

const query = async (text, params = [], client = null) => {
  const executor = client || pool;
  return executor.query(text, params);
};

const tenantQuery = async (schemaName, text, params = []) => {
  const client = await pool.connect();
  const quotedSchema = quoteIdentifier(schemaName);
  let inTransaction = false;
  try {
    await client.query('BEGIN');
    inTransaction = true;
    await client.query(`SET LOCAL search_path TO ${quotedSchema}, public`);
    const result = await client.query(text, params);
    await client.query('COMMIT');
    inTransaction = false;
    return result;
  } catch (err) {
    if (inTransaction) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw err;
  } finally {
    client.release();
  }
};

const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const tenantTransaction = async (schemaName, callback) => {
  const client = await pool.connect();
  const quotedSchema = quoteIdentifier(schemaName);
  let inTransaction = false;
  try {
    await client.query('BEGIN');
    inTransaction = true;
    await client.query(`SET LOCAL search_path TO ${quotedSchema}, public`);
    const result = await callback(client);
    await client.query('COMMIT');
    inTransaction = false;
    return result;
  } catch (err) {
    if (inTransaction) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw err;
  } finally {
    client.release();
  }
};

const connectDatabase = async () => {
  const client = await pool.connect();
  client.release();
};

module.exports = {
  pool,
  quoteIdentifier,
  query,
  tenantQuery,
  transaction,
  tenantTransaction,
  connectDatabase
};
