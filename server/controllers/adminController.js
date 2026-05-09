const {
  AuditLog,
  Organization,
  Payment,
  Property,
  Subscription,
  Unit,
  User
} = require('../models');
const { sendError } = require('../helpers/apiResponse');

const getAdminSummary = async (req, res) => {
  const organizations = await Organization.count();
  const landlords = await User.countByRole('landlord');
  const tenants = await User.countByRole('tenant');
  const activeSubscriptions = await Subscription.countActive();
  const auditEvents = await AuditLog.count();

  const orgs = await Organization.findAll();
  let properties = 0;
  let units = 0;
  let payments = 0;

  for (const org of orgs) {
    if (!org.schema_name) continue;
    try {
      properties += await Property.count(org.schema_name);
      units += await Unit.countActive(org.schema_name);
      payments += await Payment.countPaid(org.schema_name);
    } catch (error) {
      continue;
    }
  }

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
  const organizations = await Organization.findAll();

  res.json(organizations);
};

const getAuditLogs = async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 60), 1), 120);

  const auditLogs = await AuditLog.list(limit);

  res.json(auditLogs);
};

const getPendingUsers = async (req, res) => {
  const pendingUsers = await User.findPending();
  res.json(pendingUsers.map(User.sanitize));
};

const approveUser = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);

  if (!user) {
    sendError(res, 404, 'User not found');
    return;
  }

  const updatedUser = await User.update(user.id, {
    status: 'active',
    is_active: true
  });

  res.json({
    message: 'User approved successfully',
    user: User.sanitize(updatedUser)
  });
};

const updateOrganizationBilling = async (req, res) => {
  const { id } = req.params;
  const { pricePerUnit, billingCycleMonths, status } = req.body;

  const updates = {};
  if (pricePerUnit !== undefined) updates.price_per_unit = pricePerUnit;
  if (billingCycleMonths !== undefined) updates.billing_cycle_months = billingCycleMonths;
  if (status !== undefined) updates.status = status;

  const organization = await Organization.update(id, updates);

  // If the admin manually activates the organization, reset the subscription dates
  if (status === 'active' || status === 'trial') {
    const sub = await Subscription.findByOrganization(id);
    if (sub) {
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + (organization.billing_cycle_months || 1));
      
      await Subscription.update(sub.id, {
        status: status,
        next_billing_date: nextDate,
        last_billed_at: new Date()
      });
    }
  }

  res.json({
    message: 'Organization billing updated',
    organization
  });
};

module.exports = {
  getAdminSummary,
  getOrganizations,
  getAuditLogs,
  getPendingUsers,
  approveUser,
  updateOrganizationBilling
};
