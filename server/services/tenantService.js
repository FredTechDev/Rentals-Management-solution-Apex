const { runTenantMigrations } = require('../database');
const { pool, quoteIdentifier } = require('../config/database');

const createTenantSchema = async (schemaName) => {
  try {
    await runTenantMigrations(schemaName);
  } catch (error) {
    await dropTenantSchema(schemaName);
    throw error;
  }
};

const dropTenantSchema = async (schemaName) => {
  const client = await pool.connect();
  try {
    await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`);
  } finally {
    client.release();
  }
};

const schemaExists = async (schemaName) => {
  const res = await pool.query(
    'SELECT 1 FROM information_schema.schemata WHERE schema_name = $1',
    [schemaName]
  );
  return Boolean(res.rows[0]);
};

module.exports = {
  createTenantSchema,
  dropTenantSchema,
  schemaExists
};
