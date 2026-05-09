const { Tenant, Property, User, Organization } = require('../models');
const { logRequestAudit } = require('../helpers/audit');
const { sendError } = require('../helpers/apiResponse');
const { processTenantReminder } = require('../services/reminderService');
const { ROLES } = require('../helpers/rbac');

const canManageProperty = (user, property) => Boolean(property) && (
  user.role === ROLES.SUPER_ADMIN
  || property.landlord_id === user.id
  || property.manager_id === user.id
);

const toggleAutoReminders = async (req, res) => {
  const { enabled } = req.body;
  const organization = await Organization.update(req.organizationId, {
    auto_reminders_enabled: !!enabled
  });
  
  res.json({ 
    message: `Auto-reminders ${enabled ? 'enabled' : 'disabled'}`, 
    autoRemindersEnabled: organization.auto_reminders_enabled 
  });
};

const updateReminderSettings = async (req, res) => {
  const { beforeDays, afterDays } = req.body;
  const organization = await Organization.update(req.organizationId, {
    reminder_settings: {
      before_days: Number(beforeDays || 3),
      after_days: Number(afterDays || 3)
    }
  });
  
  res.json({ 
    message: 'Reminder settings updated', 
    reminderSettings: organization.reminder_settings 
  });
};

const triggerManualReminder = async (req, res) => {
  const { tenantId } = req.body;
  const tenant = await Tenant.findById(req.schema, tenantId);

  if (!tenant) {
    sendError(res, 404, 'Tenant not found');
    return;
  }

  const property = await Property.findById(req.schema, tenant.property_id);
  if (!property) {
    sendError(res, 404, 'Property not found');
    return;
  }

  if (!canManageProperty(req.user, property)) {
    sendError(res, 403, 'You do not have permission to generate reminders for this tenant');
    return;
  }

  const organization = await Organization.findById(req.organizationId);
  const sent = await processTenantReminder(req.schema, tenant, organization);

  await logRequestAudit({
    req,
    organization: req.organizationId,
    action: 'Manual reminder sent',
    entityType: 'reminder',
    entityId: tenant.id,
    metadata: {
      propertyName: property.name || '',
      summary: `Manual trigger for unit ${tenant.unit}`
    }
  });

  res.json({ message: sent ? 'Reminder sent successfully' : 'Tenant is not currently due for a reminder based on settings, but notification was still processed if forced.' });
};

const triggerAllReminders = async (req, res) => {
  const tenants = await Tenant.find(req.schema, { status: 'active' });
  const organization = await Organization.findById(req.organizationId);
  
  let count = 0;
  for (const tenant of tenants) {
    const sent = await processTenantReminder(req.schema, tenant, organization);
    if (sent) count++;
  }

  res.json({ message: `Processed reminders for ${tenants.length} tenants. ${count} notifications were actually sent based on dates.` });
};

module.exports = {
  toggleAutoReminders,
  updateReminderSettings,
  triggerManualReminder,
  triggerAllReminders
};
