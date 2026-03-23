const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'KSh' },
  method: {
    type: String,
    enum: ['mpesa', 'bank_transfer', 'card', 'cash', 'other'],
    default: 'mpesa'
  },
  reference: { type: String },
  status: {
    type: String,
    enum: ['paid', 'pending', 'overdue', 'failed'],
    default: 'pending'
  },
  paymentDate: { type: Date },
  dueDate: { type: Date, required: true },
  mpesaTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'MpesaTransaction' }
}, { timestamps: true });

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
