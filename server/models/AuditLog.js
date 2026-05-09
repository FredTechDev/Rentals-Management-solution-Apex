const { query } = require('../config/database');

class AuditLog {
  static async create({
    organization = null,
    actor = null,
    action,
    entityType = '',
    entityId = null,
    metadata = {}
  }) {
    const res = await query(
      `INSERT INTO public.audit_logs
        (organization_id, actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [organization, actor, action, entityType, entityId, metadata]
    );
    return res.rows[0];
  }

  static async count() {
    const res = await query('SELECT COUNT(*) FROM public.audit_logs');
    return Number(res.rows[0]?.count || 0);
  }

  static async list(limit = 60) {
    const res = await query(
      `SELECT al.*, u.name AS actor_name, u.email AS actor_email, u.role AS actor_role,
              o.name AS organization_name, o.status AS organization_status, o.subscription_plan
       FROM public.audit_logs al
       LEFT JOIN public.users u ON u.id = al.actor_id
       LEFT JOIN public.organizations o ON o.id = al.organization_id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  }
}

module.exports = AuditLog;
