const { Property, Suggestion, Tenant } = require('../models');
const { logRequestAudit, truncateAuditText } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');
const { ROLES } = require('../helpers/rbac');

const buildManagedPropertyFilter = (user) => {
  if (user.role === ROLES.SUPER_ADMIN) {
    return {};
  }

  return {
    landlordId: user.id,
    managerId: user.id
  };
};

const createSuggestion = async (req, res) => {
  const tenant = await Tenant.findOne(req.schema, { userId: req.user.id, status: 'active' });
  if (!tenant) {
    sendError(res, 403, 'Only active tenants can send suggestions');
    return;
  }

  const suggestion = await Suggestion.create(req.schema, {
    propertyId: tenant.property_id,
    content: req.body.content
  });

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Suggestion submitted',
    entityType: 'suggestion',
    entityId: suggestion.id,
    metadata: {
      propertyId: tenant.property_id,
      summary: truncateAuditText(req.body.content, 72)
    }
  });

  res.status(201).json({ message: 'Suggestion sent anonymously!' });
};

const getSuggestions = async (req, res) => {
  const properties = await Property.find(req.schema, buildManagedPropertyFilter(req.user));
  const propertyIds = properties.map((property) => property.id);
  const propertyMap = new Map(properties.map((property) => [property.id, property]));

  const suggestions = await Suggestion.findByPropertyIds(req.schema, propertyIds);

  res.json(suggestions.map((suggestion) => ({
    ...suggestion,
    property: propertyMap.get(suggestion.property_id)
      ? {
        id: propertyMap.get(suggestion.property_id).id,
        name: propertyMap.get(suggestion.property_id).name,
        address: propertyMap.get(suggestion.property_id).address
      }
      : null
  })));
};

module.exports = {
  createSuggestion,
  getSuggestions
};
