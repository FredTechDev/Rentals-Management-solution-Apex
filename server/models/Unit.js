const { tenantQuery } = require('../config/database');
const { buildSetClause, normalizeUpdates } = require('../helpers/sql');

const UNIT_UPDATE_FIELDS = [
  'property_id',
  'unit_number',
  'rent_amount',
  'occupancy_status',
  'tenant_assignment',
  'meter_readings',
  'is_active'
];

class Unit {
  static async findByProperty(schema, propertyId, { includeInactive = false } = {}) {
    const res = await tenantQuery(schema,
      `SELECT * FROM units WHERE property_id = $1 ${includeInactive ? '' : 'AND is_active = TRUE'}
       ORDER BY unit_number ASC`,
      [propertyId]
    );
    return res.rows;
  }

  static async upsert(schema, data) {
    const res = await tenantQuery(schema,
      `INSERT INTO units
        (property_id, unit_number, rent_amount, occupancy_status, tenant_assignment, meter_readings, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (property_id, unit_number)
       DO UPDATE SET
         rent_amount = EXCLUDED.rent_amount,
         occupancy_status = EXCLUDED.occupancy_status,
         tenant_assignment = EXCLUDED.tenant_assignment,
         meter_readings = EXCLUDED.meter_readings,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING *`,
      [
        data.propertyId,
        data.unitNumber,
        data.rentAmount || 0,
        data.occupancyStatus || 'vacant',
        data.tenantAssignment || null,
        data.meterReadings || {},
        data.isActive !== false
      ]
    );
    return res.rows[0];
  }

  static async findById(schema, id) {
    const res = await tenantQuery(schema, 'SELECT * FROM units WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async update(schema, id, updates) {
    const normalized = normalizeUpdates(updates, UNIT_UPDATE_FIELDS);
    const fields = Object.keys(normalized);
    if (!fields.length) return this.findById(schema, id);
    const values = Object.values(normalized);
    const setClause = buildSetClause(fields);
    const res = await tenantQuery(schema,
      `UPDATE units SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return res.rows[0] || null;
  }

  static async deactivateMissing(schema, propertyId, activeUnitNumbers) {
    await tenantQuery(schema,
      `UPDATE units
       SET is_active = FALSE,
           occupancy_status = 'vacant',
           tenant_assignment = NULL,
           updated_at = NOW()
       WHERE property_id = $1
         AND unit_number <> ALL($2::text[])`,
      [propertyId, activeUnitNumbers]
    );
  }

  static async countActive(schema) {
    const res = await tenantQuery(schema, 'SELECT COUNT(*) FROM units WHERE is_active = TRUE');
    return Number(res.rows[0]?.count || 0);
  }
}

module.exports = Unit;
