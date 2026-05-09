const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';

const snakeToCamel = (str) => str.replace(/(_[a-z])/g, (match) => match.toUpperCase().replace('_', ''));

export const normalizeApiData = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeApiData);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const normalized = {};

  for (const [key, entry] of Object.entries(value)) {
    const camelKey = snakeToCamel(key);
    normalized[camelKey] = normalizeApiData(entry);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'id') && !Object.prototype.hasOwnProperty.call(normalized, '_id')) {
    normalized._id = normalized.id;
  }

  return normalized;
};
