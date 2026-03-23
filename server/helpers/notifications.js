const { Notification } = require('../models');

const createNotification = async (payload) => {
  if (!payload?.user || !payload?.title || !payload?.message) {
    return null;
  }

  try {
    return await Notification.create(payload);
  } catch (error) {
    console.error('Notification creation error:', error.message);
    return null;
  }
};

module.exports = {
  createNotification
};
