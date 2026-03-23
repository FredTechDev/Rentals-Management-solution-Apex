const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  content: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Suggestion || mongoose.model('Suggestion', suggestionSchema);
