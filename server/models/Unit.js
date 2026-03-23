const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  unitNumber: { type: String, required: true, trim: true },
  rentAmount: { type: Number, default: 0 },
  occupancyStatus: {
    type: String,
    enum: ['vacant', 'occupied', 'reserved', 'maintenance'],
    default: 'vacant'
  },
  tenantAssignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  meterReadings: {
    water: { type: Number, default: 0 },
    electricity: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

unitSchema.index({ property: 1, unitNumber: 1 }, { unique: true });

module.exports = mongoose.models.Unit || mongoose.model('Unit', unitSchema);
