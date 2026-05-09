const crypto = require('crypto');
const { Organization, Subscription } = require('../models');
const { logAudit } = require('../helpers/audit');

const handlePaystackWebhook = async (req, res) => {
  // 1. Verify the Paystack Signature
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  // 2. Listen for successful charges
  if (event.event === 'charge.success') {
    const { organizationId, type } = event.data.metadata;

    if (type === 'subscription_payment' && organizationId) {
      console.log(`Reactivating organization: ${organizationId}`);
      
      // 3. Reactivate the Organization
      await Organization.update(organizationId, { status: 'active' });

      // 4. Update Subscription Dates
      const sub = await Subscription.findByOrganization(organizationId);
      const org = await Organization.findById(organizationId);

      if (sub && org) {
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + (org.billing_cycle_months || 1));

        await Subscription.update(sub.id, {
          status: 'active',
          last_billed_at: new Date(),
          next_billing_date: nextDate
        });

        await logAudit({
          organization: organizationId,
          action: 'Subscription renewed',
          entityType: 'subscription',
          entityId: sub.id,
          metadata: {
            amount: event.data.amount / 100,
            reference: event.data.reference,
            summary: 'Automated reactivation via Paystack Webhook'
          }
        });
      }
    }
  }

  // Acknowledge receipt of the webhook
  res.status(200).send('OK');
};

module.exports = {
  handlePaystackWebhook
};
