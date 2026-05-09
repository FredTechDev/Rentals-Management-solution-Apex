const { Notification } = require('../models');

const createNotification = async ({
  schema,
  userId,
  title,
  message,
  type = 'system_notice',
  channel = 'in_app',
  metadata = {}
} = {}) => {
  if (!schema || !userId || !title || !message) {
    return null;
  }

  try {
    return await Notification.create(schema, {
      userId,
      title,
      message,
      type,
      channel,
      metadata
    });
  } catch (error) {
    console.error('Notification creation error:', error.message);
    return null;
  }
};

module.exports = {
  createNotification
};
