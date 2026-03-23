const { Notification } = require('../models');
const { logRequestAudit } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');

const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(notifications);
};

const markNotificationRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate({
    _id: req.params.id,
    user: req.user.id
  }, {
    $set: { isRead: true }
  }, { new: true });

  if (!notification) {
    sendError(res, 404, 'Notification not found');
    return;
  }

  await logRequestAudit({
    req,
    organization: notification.organization || null,
    action: 'Notification marked read',
    entityType: 'notification',
    entityId: notification._id,
    metadata: {
      summary: notification.title || 'Notice read'
    }
  });

  res.json(notification);
};

module.exports = {
  getNotifications,
  markNotificationRead
};
