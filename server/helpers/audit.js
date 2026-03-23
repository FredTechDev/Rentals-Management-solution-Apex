const AuditLog = require('../models/AuditLog');

const truncateAuditText = (value, maxLength = 96) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();

  if (!text) {
    return '';
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

const logAudit = async ({
  organization = null,
  actor = null,
  action,
  entityType = '',
  entityId = null,
  metadata = {}
} = {}) => {
  if (!action) {
    return null;
  }

  try {
    const payload = {
      action,
      entityType,
      metadata
    };

    if (organization) {
      payload.organization = organization;
    }

    if (actor) {
      payload.actor = actor;
    }

    if (entityId) {
      payload.entityId = entityId;
    }

    return await AuditLog.create(payload);
  } catch (error) {
    console.error('Failed to write audit log', error);
    return null;
  }
};

const logRequestAudit = async ({
  req,
  organization = null,
  action,
  entityType = '',
  entityId = null,
  metadata = {}
} = {}) => logAudit({
  organization: organization || req?.user?.organizationId || null,
  actor: req?.user?.id || null,
  action,
  entityType,
  entityId,
  metadata: {
    route: req?.originalUrl,
    method: req?.method,
    ...metadata
  }
});

module.exports = {
  logAudit,
  logRequestAudit,
  truncateAuditText
};
