const { Organization, OrganizationMembership, User } = require('../models');
const { createTenantSchema } = require('../services/tenantService');

const ensureOrganizationForUser = async (user, fallbackName) => {
  if (user.role === 'super_admin') {
    return null;
  }

  if (user.organization_id) {
    return user.organization_id;
  }

  const organization = await Organization.create({
    name: fallbackName || `${user.name}'s Portfolio`,
    ownerId: user.id,
    status: user.role === 'super_admin' ? 'active' : 'trial',
    subscriptionPlan: 'basic',
    billingCycle: 'monthly'
  });

  await createTenantSchema(organization.schema_name);
  await User.update(user.id, { organization_id: organization.id });
  await OrganizationMembership.create({
    userId: user.id,
    organizationId: organization.id,
    isDefault: true
  });

  return organization.id;
};

module.exports = {
  ensureOrganizationForUser
};
