const mongoose = require('mongoose');

const leaseSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  unit: { type: String, required: true, trim: true },
  filePath: { type: String, required: true },
  fileName: { type: String, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  depositAmount: { type: Number, default: 0 },
  penaltyTerms: { type: String },
  signedAt: { type: Date },
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Lease || mongoose.model('Lease', leaseSchema);
