const { tenantQuery } = require('../config/database');
const { buildSetClause, normalizeUpdates } = require('../helpers/sql');

const TENANT_UPDATE_FIELDS = [
  'user_id',
  'property_id',
  'unit',
  'rent_amount',
  'due_date',
  'status',
  'start_date',
  'lease_start',
  'lease_end'
];

class Tenant {
  static async find(schema, filter = {}) {
    const conditions = [];
    const values = [];

    if (filter.propertyId) {
      values.push(filter.propertyId);
      conditions.push(`property_id = $${values.length}`);
    }

    if (filter.propertyIds?.length) {
      values.push(filter.propertyIds);
      conditions.push(`property_id = ANY($${values.length})`);
    }

    if (filter.status) {
      values.push(filter.status);
      conditions.push(`status = $${values.length}`);
    }

    if (filter.userId) {
      values.push(filter.userId);
      conditions.push(`user_id = $${values.length}`);
    }

    if (filter.unit) {
      values.push(filter.unit);
      conditions.push(`unit = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await tenantQuery(schema, `SELECT * FROM tenants ${where}`, values);
    return res.rows;
  }

  static async findOne(schema, filter = {}) {
    const res = await this.find(schema, filter);
    return res[0] || null;
  }

  static async findById(schema, id) {
    const res = await tenantQuery(schema, 'SELECT * FROM tenants WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async create(schema, data) {
    const res = await tenantQuery(schema,
      `INSERT INTO tenants
        (user_id, property_id, unit, rent_amount, due_date, status, start_date, lease_start, lease_end)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        data.userId,
        data.propertyId,
        data.unit,
        data.rentAmount,
        data.dueDate || 1,
        data.status || 'active',
        data.startDate || new Date(),
        data.leaseStart || null,
        data.leaseEnd || null
      ]
    );
    return res.rows[0];
  }

  static async update(schema, id, updates) {
    const normalized = normalizeUpdates(updates, TENANT_UPDATE_FIELDS);
    const fields = Object.keys(normalized);
    if (!fields.length) return this.findById(schema, id);
    const values = Object.values(normalized);
    const setClause = buildSetClause(fields);
    const res = await tenantQuery(schema,
      `UPDATE tenants SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return res.rows[0] || null;
  }
}

module.exports = Tenant;
