const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  unit: { type: String, required: true, trim: true },
  rentAmount: { type: Number, required: true },
  dueDate: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['active', 'defaulted', 'moved_out', 'pending'],
    default: 'active'
  },
  startDate: { type: Date, default: Date.now },
  leaseStart: { type: Date },
  leaseEnd: { type: Date }
});

module.exports = mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema);
