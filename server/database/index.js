const fs = require('fs');
const path = require('path');
const { pool, quoteIdentifier } = require('../config/database');

const readSqlFiles = (dir) => fs.readdirSync(dir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => path.join(dir, file));

const runSqlFiles = async (client, files) => {
  for (const file of files) {
    const sql = fs.readFileSync(file, 'utf8');
    if (sql.trim()) {
      await client.query(sql);
    }
  }
};

const runPublicMigrations = async () => {
  const dir = path.join(__dirname, 'migrations', 'public');
  const client = await pool.connect();
  try {
    await client.query('SET search_path TO public');
    await runSqlFiles(client, readSqlFiles(dir));
  } finally {
    await client.query('RESET search_path').catch(() => {});
    client.release();
  }
};

const runTenantMigrations = async (schemaName) => {
  const dir = path.join(__dirname, 'migrations', 'tenant');
  const client = await pool.connect();
  const quotedSchema = quoteIdentifier(schemaName);
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`);
    await client.query(`SET search_path TO ${quotedSchema}, public`);
    await runSqlFiles(client, readSqlFiles(dir));
  } finally {
    await client.query('RESET search_path').catch(() => {});
    client.release();
  }
};

module.exports = {
  runPublicMigrations,
  runTenantMigrations
};
