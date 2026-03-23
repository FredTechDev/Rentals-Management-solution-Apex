const mongoose = require('mongoose');

const mpesaTransactionSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  merchantRequestId: { type: String },
  checkoutRequestId: { type: String, unique: true, sparse: true },
  phoneNumber: { type: String },
  amount: { type: Number },
  mpesaReceiptNumber: { type: String },
  transactionDate: { type: Date },
  resultCode: { type: Number },
  resultDesc: { type: String },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.MpesaTransaction || mongoose.model('MpesaTransaction', mpesaTransactionSchema);
