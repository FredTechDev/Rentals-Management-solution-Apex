const { tenantQuery } = require('../config/database');
const { buildSetClause, normalizeUpdates } = require('../helpers/sql');

const PAYMENT_UPDATE_FIELDS = [
  'tenant_id',
  'invoice_id',
  'amount',
  'currency',
  'method',
  'reference',
  'status',
  'payment_date',
  'due_date',
  'mpesa_transaction_id'
];

class Payment {
  static async findByTenantIds(schema, tenantIds) {
    if (!tenantIds?.length) return [];
    const res = await tenantQuery(schema,
      `SELECT * FROM payments WHERE tenant_id = ANY($1::uuid[]) ORDER BY created_at DESC`,
      [tenantIds]
    );
    return res.rows;
  }

  static async findByTenantId(schema, tenantId) {
    const res = await tenantQuery(schema,
      `SELECT * FROM payments WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  static async findPendingByTenant(schema, tenantId) {
    const res = await tenantQuery(schema,
      `SELECT * FROM payments WHERE tenant_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
      [tenantId]
    );
    return res.rows[0] || null;
  }

  static async findByMpesaTransactionId(schema, mpesaTransactionId) {
    const res = await tenantQuery(schema,
      'SELECT * FROM payments WHERE mpesa_transaction_id = $1 ORDER BY created_at DESC LIMIT 1',
      [mpesaTransactionId]
    );
    return res.rows[0] || null;
  }

  static async create(schema, data) {
    const res = await tenantQuery(schema,
      `INSERT INTO payments
        (tenant_id, invoice_id, amount, currency, method, reference, status, payment_date, due_date, mpesa_transaction_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        data.tenantId,
        data.invoiceId || null,
        data.amount,
        data.currency || 'KSh',
        data.method || 'mpesa',
        data.reference || null,
        data.status || 'pending',
        data.paymentDate || null,
        data.dueDate,
        data.mpesaTransactionId || null
      ]
    );
    return res.rows[0];
  }

  static async update(schema, id, updates) {
    const normalized = normalizeUpdates(updates, PAYMENT_UPDATE_FIELDS);
    const fields = Object.keys(normalized);
    if (!fields.length) return null;
    const values = Object.values(normalized);
    const setClause = buildSetClause(fields);
    const res = await tenantQuery(schema,
      `UPDATE payments SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return res.rows[0] || null;
  }

  static async countPaid(schema) {
    const res = await tenantQuery(schema, `SELECT COUNT(*) FROM payments WHERE status = 'paid'`);
    return Number(res.rows[0]?.count || 0);
  }
}

module.exports = Payment;
