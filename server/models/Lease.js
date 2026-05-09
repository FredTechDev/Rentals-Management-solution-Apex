const { tenantQuery } = require('../config/database');

class Lease {
  static async create(schema, data) {
    const res = await tenantQuery(schema,
      `INSERT INTO leases
        (tenant_id, property_id, unit, file_path, file_name, start_date, end_date, deposit_amount, penalty_terms, signed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        data.tenantId,
        data.propertyId,
        data.unit,
        data.filePath,
        data.fileName,
        data.startDate || null,
        data.endDate || null,
        data.depositAmount || 0,
        data.penaltyTerms || null,
        data.signedAt || null
      ]
    );
    return res.rows[0];
  }

  static async findByTenant(schema, tenantUserId) {
    const res = await tenantQuery(schema, 'SELECT * FROM leases WHERE tenant_id = $1', [tenantUserId]);
    return res.rows[0] || null;
  }

  static async findById(schema, id) {
    const res = await tenantQuery(schema, 'SELECT * FROM leases WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async findByPropertyIds(schema, propertyIds) {
    if (!propertyIds?.length) return [];
    const res = await tenantQuery(schema,
      'SELECT * FROM leases WHERE property_id = ANY($1::uuid[])',
      [propertyIds]
    );
    return res.rows;
  }

  static async findByTenantAndUnit(schema, tenantUserId, propertyId, unit) {
    const res = await tenantQuery(schema,
      `SELECT * FROM leases WHERE tenant_id = $1 AND property_id = $2 AND unit = $3`,
      [tenantUserId, propertyId, unit]
    );
    return res.rows[0] || null;
  }

  static async delete(schema, id) {
    await tenantQuery(schema, 'DELETE FROM leases WHERE id = $1', [id]);
  }
}

module.exports = Lease;
