const { query } = require('../config/database');

class OrganizationMembership {
  static async create({ userId, organizationId, isDefault = false }, client = null) {
    const executor = client || { query };

    if (isDefault) {
      await executor.query(
        'UPDATE public.organization_memberships SET is_default = FALSE WHERE user_id = $1',
        [userId]
      );
    }

    const res = await executor.query(
      `INSERT INTO public.organization_memberships (user_id, organization_id, is_default)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, organization_id)
       DO UPDATE SET
         is_default = public.organization_memberships.is_default OR EXCLUDED.is_default,
         updated_at = NOW()
       RETURNING *`,
      [userId, organizationId, isDefault]
    );

    if (isDefault) {
      await executor.query(
        'UPDATE public.users SET organization_id = $2, updated_at = NOW() WHERE id = $1',
        [userId, organizationId]
      );
    }

    return res.rows[0];
  }

  static async findByUserAndOrganization(userId, organizationId) {
    const res = await query(
      `SELECT om.*, o.id, o.name, o.status, o.schema_name
       FROM public.organization_memberships om
       JOIN public.organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.organization_id = $2`,
      [userId, organizationId]
    );
    return res.rows[0] || null;
  }

  static async listByUser(userId) {
    const res = await query(
      `SELECT om.*, o.id, o.name, o.status, o.schema_name
       FROM public.organization_memberships om
       JOIN public.organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1
       ORDER BY om.is_default DESC, o.created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  static async setDefault(userId, organizationId) {
    await query(
      'UPDATE public.organization_memberships SET is_default = FALSE WHERE user_id = $1',
      [userId]
    );

    const res = await query(
      `UPDATE public.organization_memberships
       SET is_default = TRUE, updated_at = NOW()
       WHERE user_id = $1 AND organization_id = $2
       RETURNING *`,
      [userId, organizationId]
    );

    if (!res.rows[0]) {
      return null;
    }

    await query(
      'UPDATE public.users SET organization_id = $2, updated_at = NOW() WHERE id = $1',
      [userId, organizationId]
    );

    return res.rows[0];
  }

  static async listByOrganization(organizationId) {
    const res = await query(
      `SELECT om.*, u.name, u.email, u.role, u.status, u.phone_number
       FROM public.organization_memberships om
       JOIN public.users u ON u.id = om.user_id
       WHERE om.organization_id = $1
       ORDER BY u.role, u.name`,
      [organizationId]
    );
    return res.rows;
  }
}

module.exports = OrganizationMembership;
