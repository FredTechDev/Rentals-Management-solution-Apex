const {
  AuditLog,
  Organization,
  Payment,
  Property,
  Subscription,
  Unit,
  User
} = require('../models');

const getAdminSummary = async (req, res) => {
  const [
    organizations,
    landlords,
    tenants,
    activeSubscriptions,
    properties,
    units,
    payments,
    auditEvents
  ] = await Promise.all([
    Organization.countDocuments(),
    User.countDocuments({ role: 'landlord' }),
    User.countDocuments({ role: 'tenant' }),
    Subscription.countDocuments({ status: { $in: ['trial', 'active'] } }),
    Property.countDocuments(),
    Unit.countDocuments({ isActive: true }),
    Payment.countDocuments({ status: 'paid' }),
    AuditLog.countDocuments()
  ]);

  res.json({
    organizations,
    landlords,
    tenants,
    properties,
    units,
    activeSubscriptions,
    successfulPayments: payments,
    auditEvents
  });
};

const getOrganizations = async (req, res) => {
  const organizations = await Organization.find()
    .populate('owner', 'name email role')
    .sort({ createdAt: -1 });

  res.json(organizations);
};

const getAuditLogs = async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 60), 1), 120);

  const auditLogs = await AuditLog.find()
    .populate('actor', 'name email role')
    .populate('organization', 'name status subscriptionPlan')
    .sort({ createdAt: -1 })
    .limit(limit);

  res.json(auditLogs);
};

module.exports = {
  getAdminSummary,
  getOrganizations,
  getAuditLogs
};
