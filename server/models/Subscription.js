const { query } = require('../config/database');
const { buildSetClause, normalizeUpdates } = require('../helpers/sql');

const SUBSCRIPTION_UPDATE_FIELDS = [
  'organization_id',
  'plan',
  'billing_cycle',
  'status',
  'provider',
  'provider_subscription_id',
  'started_at',
  'ends_at',
  'trial_ends_at',
  'next_billing_date',
  'last_billed_at',
  'billable_units_at_last_bill'
];

class Subscription {
  static async create({
    organizationId,
    plan = 'basic',
    billingCycle = 'monthly',
    status = 'trial',
    provider = 'manual',
    providerSubscriptionId = null,
    startedAt = new Date(),
    endsAt = null,
    trialEndsAt = null,
    nextBillingDate = null
  }, client = null) {
    const executor = client || { query };
    const res = await executor.query(
      `INSERT INTO public.subscriptions
        (organization_id, plan, billing_cycle, status, provider, provider_subscription_id, started_at, ends_at, trial_ends_at, next_billing_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [organizationId, plan, billingCycle, status, provider, providerSubscriptionId, startedAt, endsAt, trialEndsAt, nextBillingDate]
    );
    return res.rows[0];
  }

  static async update(id, updates, client = null) {
    const normalized = normalizeUpdates(updates, SUBSCRIPTION_UPDATE_FIELDS);
    const fields = Object.keys(normalized);
    if (!fields.length) return this.findById(id);
    const values = Object.values(normalized);
    const setClause = buildSetClause(fields);
    const executor = client || { query };
    const res = await executor.query(
      `UPDATE public.subscriptions SET ${setClause}, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return res.rows[0] || null;
  }

  static async findById(id) {
    const res = await query('SELECT * FROM public.subscriptions WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async findByOrganization(organizationId) {
    const res = await query('SELECT * FROM public.subscriptions WHERE organization_id = $1 ORDER BY created_at DESC', [organizationId]);
    return res.rows[0] || null;
  }

  static async countActive() {
    const res = await query(
      `SELECT COUNT(*) FROM public.subscriptions WHERE status IN ('trial', 'active')`
    );
    return Number(res.rows[0]?.count || 0);
  }
}

module.exports = Subscription;
