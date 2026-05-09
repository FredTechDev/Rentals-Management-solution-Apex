const { tenantQuery } = require('../config/database');

class Message {
  static async list(schema, propertyId = null) {
    const query = propertyId 
      ? 'SELECT * FROM messages WHERE property_id = $1 ORDER BY timestamp ASC'
      : 'SELECT * FROM messages WHERE property_id IS NULL ORDER BY timestamp ASC';
    const values = propertyId ? [propertyId] : [];
    const res = await tenantQuery(schema, query, values);
    return res.rows;
  }

  static async create(schema, data) {
    const res = await tenantQuery(schema,
      `INSERT INTO messages (sender_id, recipient_id, content, property_id)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [data.senderId, data.recipientId || null, data.content, data.propertyId || null]
    );
    return res.rows[0];
  }

  static async findById(schema, id) {
    const res = await tenantQuery(schema, 'SELECT * FROM messages WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
}

module.exports = Message;
