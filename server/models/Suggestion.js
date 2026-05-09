const { tenantQuery } = require('../config/database');

class Suggestion {
  static async create(schema, data) {
    const res = await tenantQuery(schema,
      `INSERT INTO suggestions (property_id, content)
       VALUES ($1,$2)
       RETURNING *`,
      [data.propertyId, data.content]
    );
    return res.rows[0];
  }

  static async findByPropertyIds(schema, propertyIds) {
    if (!propertyIds?.length) return [];
    const res = await tenantQuery(schema,
      `SELECT * FROM suggestions WHERE property_id = ANY($1::uuid[]) ORDER BY created_at DESC`,
      [propertyIds]
    );
    return res.rows;
  }
}

module.exports = Suggestion;
