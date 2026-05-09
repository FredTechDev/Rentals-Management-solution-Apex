const { Notification } = require('../models');
const { logRequestAudit } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');

const getNotifications = async (req, res) => {
  const notifications = await Notification.findByUser(req.schema, req.user.id);
  res.json(notifications);
};

const markNotificationRead = async (req, res) => {
  const notification = await Notification.markRead(req.schema, req.params.id, req.user.id);

  if (!notification) {
    sendError(res, 404, 'Notification not found');
    return;
  }

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Notification marked read',
    entityType: 'notification',
    entityId: notification.id,
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
