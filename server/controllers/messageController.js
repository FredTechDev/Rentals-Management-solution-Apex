const { Message, User } = require('../models');
const { logRequestAudit, truncateAuditText } = require('../helpers/audit');

const getMessages = async (req, res) => {
  const currentUser = await User.findById(req.user.id).select('organization');
  const filter = currentUser?.organization ? { organization: currentUser.organization } : {};

  const messages = await Message.find(filter).populate('sender', 'name').sort({ timestamp: 1 });
  res.json(messages);
};

const createMessage = async (req, res) => {
  const currentUser = await User.findById(req.user.id).select('organization');

  const message = new Message({
    organization: currentUser?.organization,
    sender: req.user.id,
    content: req.body.content
  });

  await message.save();

  await logRequestAudit({
    req,
    organization: currentUser?.organization || null,
    action: 'Community message sent',
    entityType: 'message',
    entityId: message._id,
    metadata: {
      summary: truncateAuditText(req.body.content, 72)
    }
  });

  const populatedMessage = await Message.findById(message._id).populate('sender', 'name');
  res.status(201).json(populatedMessage);
};

module.exports = {
  getMessages,
  createMessage
};
