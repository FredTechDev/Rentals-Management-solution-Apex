const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['rent_due', 'payment_confirmation', 'maintenance_update', 'lease_expiry', 'system_notice'],
    default: 'system_notice'
  },
  channel: {
    type: String,
    enum: ['sms', 'email', 'in_app'],
    default: 'in_app'
  },
  isRead: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
