const mongoose = require('mongoose');
const { ROLES } = require('../helpers/rbac');

const userSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, trim: true },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.TENANT
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'rejected', 'suspended'],
    default: 'pending'
  },
  interestedProperty: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  interestedUnit: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
