const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: { type: String, default: 'apartment', trim: true },
  landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  caretakers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  units: [{ type: String, trim: true }],
  images: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.models.Property || mongoose.model('Property', propertySchema);
