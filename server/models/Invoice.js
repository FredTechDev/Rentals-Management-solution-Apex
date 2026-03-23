const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  unit: { type: String, trim: true },
  amount: { type: Number, required: true },
  utilities: { type: Number, default: 0 },
  penalties: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  dueDate: { type: Date, required: true },
  issuedAt: { type: Date, default: Date.now },
  lineItems: [{
    label: { type: String, trim: true },
    amount: { type: Number, default: 0 }
  }]
}, { timestamps: true });

module.exports = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
