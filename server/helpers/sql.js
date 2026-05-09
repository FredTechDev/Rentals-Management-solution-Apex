const normalizeUpdates = (updates = {}, allowedFields = []) => {
  const allowed = new Set(allowedFields);
  const normalized = {};

  for (const [field, value] of Object.entries(updates || {})) {
    if (value === undefined) continue;
    if (!allowed.has(field)) {
      throw new Error(`Unsupported update field: ${field}`);
    }
    normalized[field] = value;
  }

  return normalized;
};

const buildSetClause = (fields, startIndex = 2) =>
  fields.map((field, index) => `${field} = $${index + startIndex}`).join(', ');

module.exports = {
  buildSetClause,
  normalizeUpdates
};
