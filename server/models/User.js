const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { ROLES } = require('../helpers/rbac');
const { buildSetClause, normalizeUpdates } = require('../helpers/sql');

const SALT_ROUNDS = 12;
const USER_UPDATE_FIELDS = [
  'organization_id',
  'name',
  'email',
  'password_hash',
  'phone_number',
  'role',
  'status',
  'interested_property_id',
  'interested_property_schema',
  'interested_unit',
  'is_active',
  'last_login_at',
  'requires_password_change'
];

class User {
  static sanitize(user) {
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return rest;
  }

  static async create({
    name,
    email,
    password,
    phoneNumber = null,
    role = ROLES.TENANT,
    status = 'pending',
    organizationId = null,
    interestedPropertyId = null,
    interestedPropertySchema = null,
    interestedUnit = null,
    isActive = true,
    requiresPasswordChange = false
  }, client = null) {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const executor = client || { query };
    const res = await executor.query(
      `INSERT INTO public.users
        (organization_id, name, email, password_hash, phone_number, role, status,
         interested_property_id, interested_property_schema, interested_unit, is_active, requires_password_change)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        organizationId,
        name,
        email.toLowerCase(),
        hash,
        phoneNumber,
        role,
        status,
        interestedPropertyId,
        interestedPropertySchema,
        interestedUnit,
        isActive,
        requiresPasswordChange
      ]
    );
    return res.rows[0];
  }

  static async findById(id) {
    const res = await query('SELECT * FROM public.users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  static async findByEmail(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return null;
    const res = await query('SELECT * FROM public.users WHERE email = $1', [normalizedEmail]);
    return res.rows[0] || null;
  }

  static async findByIds(ids = []) {
    if (!ids.length) return [];
    const res = await query('SELECT * FROM public.users WHERE id = ANY($1::uuid[])', [ids]);
    return res.rows;
  }

  static async update(id, updates, client = null) {
    const normalized = { ...updates };
    if (normalized.email) {
      normalized.email = normalized.email.toLowerCase();
    }
    if (Object.prototype.hasOwnProperty.call(normalized, 'password')) {
      normalized.password_hash = await bcrypt.hash(normalized.password, SALT_ROUNDS);
      delete normalized.password;
    }
    const safeUpdates = normalizeUpdates(normalized, USER_UPDATE_FIELDS);
    const fields = Object.keys(safeUpdates);
    if (!fields.length) return this.findById(id);
    const values = Object.values(safeUpdates);
    const setClause = buildSetClause(fields);
    const executor = client || { query };
    const res = await executor.query(
      `UPDATE public.users SET ${setClause}, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return res.rows[0] || null;
  }

  static async verifyPassword(user, password) {
    if (!user?.password_hash) return false;
    return bcrypt.compare(password, user.password_hash);
  }

  static async countByRole(role) {
    const res = await query('SELECT COUNT(*) FROM public.users WHERE role = $1', [role]);
    return Number(res.rows[0]?.count || 0);
  }

  static async countByStatus(status) {
    const res = await query('SELECT COUNT(*) FROM public.users WHERE status = $1', [status]);
    return Number(res.rows[0]?.count || 0);
  }

  static async findPending() {
    const res = await query('SELECT * FROM public.users WHERE status = \'pending\' ORDER BY created_at DESC');
    return res.rows;
  }

  static async findAll() {
    const res = await query('SELECT * FROM public.users ORDER BY created_at DESC');
    return res.rows;
  }

  static async findPendingByPropertyIds(propertyIds, schemaName) {
    if (!propertyIds?.length) return [];
    const res = await query(
      `SELECT * FROM public.users
       WHERE status = 'pending'
         AND interested_property_id = ANY($1::uuid[])
         AND interested_property_schema = $2`,
      [propertyIds, schemaName]
    );
    return res.rows;
  }
}

module.exports = User;
