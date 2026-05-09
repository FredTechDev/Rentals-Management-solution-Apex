const { tenantQuery } = require('../config/database');

class Invoice {
  static async create(schema, data) {
    const res = await tenantQuery(schema,
      `INSERT INTO invoices
        (tenant_id, property_id, unit, amount, utilities, penalties, total_amount, status, due_date, issued_at, line_items)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        data.tenantId,
        data.propertyId || null,
        data.unit || null,
        data.amount,
        data.utilities || 0,
        data.penalties || 0,
        data.totalAmount,
        data.status || 'draft',
        data.dueDate,
        data.issuedAt || new Date(),
        data.lineItems || []
      ]
    );
    return res.rows[0];
  }

  static async find(schema, filter = {}) {
    const conditions = [];
    const values = [];

    if (filter.tenantId) {
      values.push(filter.tenantId);
      conditions.push(`tenant_id = $${values.length}`);
    }

    if (filter.status) {
      values.push(filter.status);
      conditions.push(`status = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await tenantQuery(schema, `SELECT * FROM invoices ${where}`, values);
    return res.rows;
  }
}

module.exports = Invoice;
