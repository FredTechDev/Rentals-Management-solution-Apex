const { query } = require('../config/database');
const { buildSetClause, normalizeUpdates } = require('../helpers/sql');

const ORGANIZATION_UPDATE_FIELDS = [
  'name',
  'owner_id',
  'status',
  'subscription_plan',
  'billing_cycle',
  'settings',
  'schema_name',
  'auto_reminders_enabled',
  'reminder_settings',
  'global_chat_enabled',
  'mpesa_shortcode',
  'mpesa_consumer_key',
  'mpesa_consumer_secret',
  'mpesa_passkey',
  'bank_details',
  'payment_methods',
  'price_per_unit',
  'billing_cycle_months'
];

const normalizeSchemaName = (name) => {
  const suffix = Date.now().toString(36);
  const prefix = 'tenant_';
  const slug = String(name || 'org')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'org';
  const maxSlugLength = 63 - prefix.length - suffix.length - 1;
  return `${prefix}${slug.slice(0, maxSlugLength)}_${suffix}`;
};

class Organization {
  static async create({
    name,
    ownerId = null,
    status = 'trial',
    subscriptionPlan = 'basic',
    billingCycle = 'monthly',
    settings = {},
    autoRemindersEnabled = false,
    reminderSettings = { before_days: 3, after_days: 3 },
    globalChatEnabled = false,
    mpesaShortcode = null,
    mpesaConsumerKey = null,
    mpesaConsumerSecret = null,
    mpesaPasskey = null,
    bankDetails = {},
    paymentMethods = ['mpesa'],
    pricePerUnit = 500.00,
    billingCycleMonths = 1
  }, client = null) {
    const schemaName = normalizeSchemaName(name);
    const executor = client || { query };
    const res = await executor.query(
      `INSERT INTO public.organizations
        (name, owner_id, status, subscription_plan, billing_cycle, settings, schema_name, 
         auto_reminders_enabled, reminder_settings, global_chat_enabled,
         mpesa_shortcode, mpesa_consumer_key, mpesa_consumer_secret, mpesa_passkey, bank_details, payment_methods,
         price_per_unit, billing_cycle_months)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        name, ownerId, status, subscriptionPlan, billingCycle, settings, schemaName, 
        autoRemindersEnabled, reminderSettings, globalChatEnabled,
        mpesaShortcode, mpesaConsumerKey, mpesaConsumerSecret, mpesaPasskey, bankDetails, paymentMethods,
        pricePerUnit, billingCycleMonths
      ]
    );
    return res.rows[0];
  }

  static async update(id, updates, client = null) {
    const normalized = normalizeUpdates(updates, ORGANIZATION_UPDATE_FIELDS);
    const fields = Object.keys(normalized);
    if (!fields.length) return this.findById(id);
    const values = Object.values(normalized);
    const setClause = buildSetClause(fields);
    const executor = client || { query };
    const res = await executor.query(
      `UPDATE public.organizations SET ${setClause}, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return res.rows[0] || null;
  }

  static async findById(id) {
    const res = await query('SELECT * FROM public.organizations WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async findAll() {
    const res = await query(
      `SELECT o.*, u.name AS owner_name, u.email AS owner_email, u.role AS owner_role
       FROM public.organizations o
       LEFT JOIN public.users u ON o.owner_id = u.id
       ORDER BY o.created_at DESC`
    );
    return res.rows;
  }

  static async count() {
    const res = await query('SELECT COUNT(*) FROM public.organizations');
    return Number(res.rows[0]?.count || 0);
  }
}

module.exports = Organization;
