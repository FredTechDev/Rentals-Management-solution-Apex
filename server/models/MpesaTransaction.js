const { tenantQuery } = require('../config/database');
const { buildSetClause, normalizeUpdates } = require('../helpers/sql');

const MPESA_TRANSACTION_UPDATE_FIELDS = [
  'tenant_id',
  'merchant_request_id',
  'checkout_request_id',
  'phone_number',
  'amount',
  'mpesa_receipt_number',
  'transaction_date',
  'result_code',
  'result_desc',
  'status'
];

class MpesaTransaction {
  static async create(schema, data) {
    const res = await tenantQuery(schema,
      `INSERT INTO mpesa_transactions
        (tenant_id, merchant_request_id, checkout_request_id, phone_number, amount, status)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        data.tenantId || null,
        data.merchantRequestId || null,
        data.checkoutRequestId || null,
        data.phoneNumber || null,
        data.amount || null,
        data.status || 'pending'
      ]
    );
    return res.rows[0];
  }

  static async findByCheckoutRequestId(schema, checkoutRequestId) {
    const res = await tenantQuery(schema,
      'SELECT * FROM mpesa_transactions WHERE checkout_request_id = $1',
      [checkoutRequestId]
    );
    return res.rows[0] || null;
  }

  static async update(schema, id, updates) {
    const normalized = normalizeUpdates(updates, MPESA_TRANSACTION_UPDATE_FIELDS);
    const fields = Object.keys(normalized);
    if (!fields.length) return null;
    const values = Object.values(normalized);
    const setClause = buildSetClause(fields);
    const res = await tenantQuery(schema,
      `UPDATE mpesa_transactions SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return res.rows[0] || null;
  }

  static async findById(schema, id) {
    const res = await tenantQuery(schema, 'SELECT * FROM mpesa_transactions WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
}

module.exports = MpesaTransaction;
