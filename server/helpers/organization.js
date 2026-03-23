const { Organization } = require('../models');

const ensureOrganizationForUser = async (user, fallbackName) => {
  if (user.organization) {
    return user.organization;
  }

  const organization = await Organization.create({
    name: fallbackName || `${user.name}'s Portfolio`,
    owner: user._id,
    status: user.role === 'super_admin' ? 'active' : 'trial',
    subscriptionPlan: 'basic',
    billingCycle: 'monthly'
  });

  user.organization = organization._id;
  await user.save();

  return organization._id;
};

module.exports = {
  ensureOrganizationForUser
};
