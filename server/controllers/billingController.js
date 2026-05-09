const { Organization, Subscription, User } = require('../models');
const { generatePaystackLink, countOccupiedUnits } = require('../services/billingService');
const { sendError } = require('../helpers/apiResponse');

const getMyBilling = async (req, res) => {
  const organization = await Organization.findById(req.organizationId);
  const subscription = await Subscription.findByOrganization(req.organizationId);
  const occupiedUnits = await countOccupiedUnits(req.schema);

  res.json({
    organization: {
      id: organization.id,
      name: organization.name,
      status: organization.status,
      pricePerUnit: organization.price_per_unit,
      billingCycleMonths: organization.billing_cycle_months
    },
    subscription,
    currentUsage: {
      occupiedUnits,
      estimatedNextBill: occupiedUnits * Number(organization.price_per_unit)
    }
  });
};

const initializeSubscriptionPayment = async (req, res) => {
  const organization = await Organization.findById(req.organizationId);
  const user = await User.findById(req.user.id); // The landlord
  const occupiedUnits = await countOccupiedUnits(req.schema);
  const amount = occupiedUnits * Number(organization.price_per_unit);

  if (amount <= 0) {
    return res.json({ message: 'No balance due at this time.' });
  }

  const paymentUrl = await generatePaystackLink(user.email, amount, {
    organizationId: organization.id,
    type: 'subscription_payment'
  });

  res.json({ paymentUrl });
};

module.exports = {
  getMyBilling,
  initializeSubscriptionPayment
};
