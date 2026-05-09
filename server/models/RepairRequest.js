const { tenantQuery } = require('../config/database');
const { buildSetClause, normalizeUpdates } = require('../helpers/sql');

const REPAIR_REQUEST_UPDATE_FIELDS = [
  'tenant_id',
  'property_id',
  'unit',
  'category',
  'description',
  'status',
  'assigned_to',
  'landlord_response',
  'technician_details',
  'image_path',
  'cost'
];

class RepairRequest {
  static async findByPropertyIds(schema, propertyIds) {
    if (!propertyIds?.length) return [];
    const res = await tenantQuery(schema,
      'SELECT * FROM repair_requests WHERE property_id = ANY($1::uuid[])',
      [propertyIds]
    );
    return res.rows;
  }

  static async findByAssignedTo(schema, userId) {
    const res = await tenantQuery(schema,
      'SELECT * FROM repair_requests WHERE assigned_to = $1',
      [userId]
    );
    return res.rows;
  }

  static async findByTenant(schema, userId) {
    const res = await tenantQuery(schema,
      'SELECT * FROM repair_requests WHERE tenant_id = $1',
      [userId]
    );
    return res.rows;
  }

  static async findById(schema, id) {
    const res = await tenantQuery(schema, 'SELECT * FROM repair_requests WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async create(schema, data) {
    const res = await tenantQuery(schema,
      `INSERT INTO repair_requests
        (tenant_id, property_id, unit, category, description, status, assigned_to, landlord_response,
         technician_details, image_path, cost)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        data.tenantId,
        data.propertyId,
        data.unit,
        data.category || 'general',
        data.description,
        data.status || 'pending',
        data.assignedTo || null,
        data.landlordResponse || null,
        data.technicianDetails || null,
        data.imagePath || null,
        data.cost || 0
      ]
    );
    return res.rows[0];
  }

  static async update(schema, id, updates) {
    const normalized = normalizeUpdates(updates, REPAIR_REQUEST_UPDATE_FIELDS);
    const fields = Object.keys(normalized);
    if (!fields.length) return null;
    const values = Object.values(normalized);
    const setClause = buildSetClause(fields);
    const res = await tenantQuery(schema,
      `UPDATE repair_requests SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return res.rows[0] || null;
  }

  static async delete(schema, id) {
    await tenantQuery(schema, 'DELETE FROM repair_requests WHERE id = $1', [id]);
  }
}

module.exports = RepairRequest;
