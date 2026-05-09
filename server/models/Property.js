const { tenantQuery } = require('../config/database');
const { buildSetClause, normalizeUpdates } = require('../helpers/sql');

const PROPERTY_UPDATE_FIELDS = [
  'name',
  'address',
  'description',
  'type',
  'landlord_id',
  'manager_id',
  'units',
  'images'
];

class Property {
  static async find(schema, filter = {}) {
    const conditions = [];
    const ownershipConditions = [];
    const values = [];

    if (filter.landlordId) {
      values.push(filter.landlordId);
      ownershipConditions.push(`landlord_id = $${values.length}`);
    }

    if (filter.managerId) {
      values.push(filter.managerId);
      ownershipConditions.push(`manager_id = $${values.length}`);
    }

    if (ownershipConditions.length) {
      conditions.push(`(${ownershipConditions.join(' OR ')})`);
    }

    if (filter.ids?.length) {
      values.push(filter.ids);
      conditions.push(`id = ANY($${values.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await tenantQuery(schema, `SELECT * FROM properties ${where} ORDER BY created_at DESC`, values);
    return res.rows;
  }

  static async findById(schema, id) {
    const res = await tenantQuery(schema, 'SELECT * FROM properties WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async findByName(schema, name) {
    const res = await tenantQuery(schema, 'SELECT * FROM properties WHERE name = $1', [name]);
    return res.rows[0] || null;
  }

  static async create(schema, data) {
    const res = await tenantQuery(schema,
      `INSERT INTO properties
        (name, address, description, type, landlord_id, manager_id, units, images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        data.name,
        data.address,
        data.description || null,
        data.type || 'apartment',
        data.landlordId,
        data.managerId || null,
        data.units || [],
        data.images || []
      ]
    );
    return res.rows[0];
  }

  static async update(schema, id, updates) {
    const normalized = normalizeUpdates(updates, PROPERTY_UPDATE_FIELDS);
    const fields = Object.keys(normalized);
    if (!fields.length) return this.findById(schema, id);
    const values = Object.values(normalized);
    const setClause = buildSetClause(fields);
    const res = await tenantQuery(schema,
      `UPDATE properties SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return res.rows[0] || null;
  }

  static async delete(schema, id) {
    await tenantQuery(schema, 'DELETE FROM properties WHERE id = $1', [id]);
  }

  static async count(schema) {
    const res = await tenantQuery(schema, 'SELECT COUNT(*) FROM properties');
    return Number(res.rows[0]?.count || 0);
  }
}

module.exports = Property;
