const { Tenant, Property } = require('../models');
const { logRequestAudit } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');
const { generateReminder } = require('../services/aiService');

const generateTenantReminder = async (req, res) => {
  const { tenantId } = req.body;
  const tenant = await Tenant.findById(tenantId).populate('user');

  if (!tenant) {
    sendError(res, 404, 'Tenant not found');
    return;
  }

  const property = await Property.findById(tenant.property);
  if (!property) {
    sendError(res, 404, 'Property not found');
    return;
  }

  const reminderText = await generateReminder(
    tenant.user.name,
    property.address,
    tenant.rentAmount,
    tenant.dueDate
  );

  await logRequestAudit({
    req,
    organization: property.organization || null,
    action: 'Reminder generated',
    entityType: 'reminder',
    entityId: tenant._id,
    metadata: {
      propertyName: property.name || '',
      summary: `${tenant.user.name} • ${property.name || property.address}`
    }
  });

  res.json({ reminderText });
};

module.exports = {
  generateTenantReminder
};
