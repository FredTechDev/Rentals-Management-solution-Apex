const { tenantQuery } = require('../config/database');

class Notification {
  static async findByUser(schema, userId) {
    const res = await tenantQuery(schema,
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return res.rows;
  }

  static async create(schema, data) {
    const res = await tenantQuery(schema,
      `INSERT INTO notifications
        (user_id, title, message, type, channel, is_read, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        data.userId,
        data.title,
        data.message,
        data.type || 'system_notice',
        data.channel || 'in_app',
        data.isRead || false,
        data.metadata || {}
      ]
    );
    return res.rows[0];
  }

  static async markRead(schema, id, userId) {
    const res = await tenantQuery(schema,
      `UPDATE notifications SET is_read = TRUE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    return res.rows[0] || null;
  }
}

module.exports = Notification;
