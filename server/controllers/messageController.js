const { Message, User, Tenant, Property, Organization } = require('../models');
const { logRequestAudit, truncateAuditText } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');
const { ROLES } = require('../helpers/rbac');

const managementRoles = [ROLES.LANDLORD, ROLES.PROPERTY_MANAGER, ROLES.SUPER_ADMIN];

const checkChatAccess = async (req, propertyId) => {
  const organization = await Organization.findById(req.organizationId);
  
  if (!propertyId) {
    // Global chat access:
    // Staff always have access. Tenants only if the landlord enabled it.
    if (managementRoles.includes(req.user.role)) return true;
    return organization && organization.global_chat_enabled;
  }
  
  if (managementRoles.includes(req.user.role)) {
    if (req.user.role === ROLES.SUPER_ADMIN) return true;
    const property = await Property.findById(req.schema, propertyId);
    return property && (property.landlord_id === req.user.id || property.manager_id === req.user.id);
  }

  // For tenants, check if they live in the property
  const tenant = await Tenant.findOne(req.schema, { userId: req.user.id, propertyId });
  return !!tenant;
};

const getMessages = async (req, res) => {
  let propertyId = req.query.propertyId || null;

  // Defaulting logic for tenants: If they don't specify, give them their building chat
  if (!propertyId && req.user.role === ROLES.TENANT) {
    const tenantRecord = await Tenant.findOne(req.schema, { userId: req.user.id });
    if (tenantRecord) {
      propertyId = tenantRecord.property_id;
    }
  }

  if (!(await checkChatAccess(req, propertyId))) {
    const errorMsg = propertyId 
      ? 'You do not have access to this chat' 
      : 'The organization-wide chat is currently disabled by the landlord';
    return sendError(res, 403, errorMsg);
  }

  const messages = await Message.list(req.schema, propertyId);
  const senderIds = [...new Set(messages.map((message) => message.sender_id))];
  const users = await User.findByIds(senderIds);
  const userMap = new Map(users.map((user) => [user.id, user]));

  res.json({
    propertyId,
    isGlobal: !propertyId,
    messages: messages.map((message) => ({
      ...message,
      sender: userMap.get(message.sender_id)
        ? { id: userMap.get(message.sender_id).id, name: userMap.get(message.sender_id).name, role: userMap.get(message.sender_id).role }
        : null
    }))
  });
};

const createMessage = async (req, res) => {
  let { content, propertyId } = req.body;

  // Defaulting logic for tenants
  if (!propertyId && req.user.role === ROLES.TENANT) {
    const tenantRecord = await Tenant.findOne(req.schema, { userId: req.user.id });
    if (tenantRecord) {
      propertyId = tenantRecord.property_id;
    }
  }

  if (!(await checkChatAccess(req, propertyId))) {
    const errorMsg = propertyId 
      ? 'You do not have permission to post in this chat' 
      : 'The organization-wide chat is currently disabled by the landlord';
    return sendError(res, 403, errorMsg);
  }

  const message = await Message.create(req.schema, {
    senderId: req.user.id,
    content,
    propertyId: propertyId || null
  });

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: propertyId ? 'Property message sent' : 'Community message sent',
    entityType: 'message',
    entityId: message.id,
    metadata: {
      propertyId: propertyId || null,
      summary: truncateAuditText(content, 72)
    }
  });

  const sender = await User.findById(req.user.id);
  res.status(201).json({
    ...message,
    sender: sender ? { id: sender.id, name: sender.name, role: sender.role } : null
  });
};

const toggleGlobalChat = async (req, res) => {
  if (!managementRoles.includes(req.user.role)) {
    return sendError(res, 403, 'Only landlords can toggle the global chat');
  }

  const { enabled } = req.body;
  const organization = await Organization.update(req.organizationId, {
    global_chat_enabled: !!enabled
  });

  res.json({ 
    message: `Organization-wide chat ${organization.global_chat_enabled ? 'enabled' : 'disabled'}`,
    globalChatEnabled: organization.global_chat_enabled 
  });
};

module.exports = {
  getMessages,
  createMessage,
  toggleGlobalChat
};
