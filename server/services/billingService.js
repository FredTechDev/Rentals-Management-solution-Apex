const axios = require('axios');
const { Organization, Subscription, Unit } = require('../models');
const { tenantQuery } = require('../config/database');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const countOccupiedUnits = async (schemaName) => {
  const res = await tenantQuery(schemaName, 
    "SELECT COUNT(*) FROM units WHERE occupancy_status = 'occupied' AND is_active = TRUE"
  );
  return Number(res.rows[0]?.count || 0);
};

const generatePaystackLink = async (email, amount, metadata = {}) => {
  try {
    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      email,
      amount: amount * 100, // Paystack works in kobo/cents
      metadata,
      callback_url: `${process.env.FRONTEND_URL}/billing/callback`
    }, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.data.authorization_url;
  } catch (error) {
    console.error('Paystack Init Error:', error.response?.data || error.message);
    throw new Error('Failed to initialize Paystack payment');
  }
};

const checkAndGenerateBills = async () => {
  console.log('--- Starting Subscription Billing Check ---');
  const organizations = await Organization.findAll();
  const today = new Date();

  for (const org of organizations) {
    if (!org.schema_name) continue;

    const sub = await Subscription.findByOrganization(org.id);
    if (!sub) continue;

    // Check if next_billing_date is reached
    if (sub.next_billing_date && new Date(sub.next_billing_date) <= today) {
      const occupiedUnits = await countOccupiedUnits(org.schema_name);
      const billAmount = occupiedUnits * Number(org.price_per_unit);

      console.log(`Billing Org: ${org.name} | Units: ${occupiedUnits} | Amount: ${billAmount}`);

      // Here we would ideally send an email with the Paystack link
      // For now, we update the organization status to 'past_due' if amount > 0
      if (billAmount > 0) {
        await Organization.update(org.id, { status: 'suspended' }); // Lock them out
      }

      // Update subscription for next cycle
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + (org.billing_cycle_months || 1));
      
      await Subscription.update(sub.id, {
        last_billed_at: today,
        next_billing_date: nextDate,
        billable_units_at_last_bill: occupiedUnits
      });
    }
  }
  console.log('--- Finished Subscription Billing Check ---');
};

module.exports = {
  countOccupiedUnits,
  generatePaystackLink,
  checkAndGenerateBills
};
