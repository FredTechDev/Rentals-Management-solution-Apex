const { Property, Suggestion, Tenant } = require('../models');
const { logRequestAudit, truncateAuditText } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');
const { ROLES } = require('../helpers/rbac');

const buildManagedPropertyQuery = (user) => {
  if (user.role === ROLES.SUPER_ADMIN) {
    return {};
  }

  return {
    $or: [
      { landlord: user.id },
      { manager: user.id }
    ]
  };
};

const createSuggestion = async (req, res) => {
  const tenant = await Tenant.findOne({ user: req.user.id, status: 'active' });
  if (!tenant) {
    sendError(res, 403, 'Only active tenants can send suggestions');
    return;
  }

  const suggestion = new Suggestion({
    organization: tenant.organization,
    property: tenant.property,
    content: req.body.content
  });

  await suggestion.save();

  await logRequestAudit({
    req,
    organization: tenant.organization,
    action: 'Suggestion submitted',
    entityType: 'suggestion',
    entityId: suggestion._id,
    metadata: {
      propertyId: tenant.property,
      summary: truncateAuditText(req.body.content, 72)
    }
  });

  res.status(201).json({ message: 'Suggestion sent anonymously!' });
};

const getSuggestions = async (req, res) => {
  const properties = await Property.find(buildManagedPropertyQuery(req.user));
  const propertyIds = properties.map((property) => property._id);

  const suggestions = await Suggestion.find({
    property: { $in: propertyIds }
  }).populate('property', 'name address').sort({ createdAt: -1 });

  res.json(suggestions);
};

module.exports = {
  createSuggestion,
  getSuggestions
};
