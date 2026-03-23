const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  plan: {
    type: String,
    enum: ['basic', 'pro', 'enterprise'],
    default: 'basic'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  status: {
    type: String,
    enum: ['trial', 'active', 'past_due', 'cancelled', 'suspended'],
    default: 'trial'
  },
  provider: { type: String, default: 'manual' },
  providerSubscriptionId: { type: String },
  startedAt: { type: Date, default: Date.now },
  endsAt: { type: Date },
  trialEndsAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
