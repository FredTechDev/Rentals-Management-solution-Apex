const mongoose = require('mongoose');

const repairRequestSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  unit: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['plumbing', 'electricity', 'security', 'general'],
    default: 'general'
  },
  description: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending'
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  landlordResponse: { type: String },
  technicianDetails: { type: String },
  imagePath: { type: String },
  cost: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.RepairRequest || mongoose.model('RepairRequest', repairRequestSchema);
