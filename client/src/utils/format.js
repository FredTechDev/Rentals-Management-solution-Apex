export const formatCurrency = (amount, currency = 'KSh') => {
  const numericAmount = Number(amount || 0);
  return `${currency} ${numericAmount.toLocaleString()}`;
};

export const formatDate = (value, fallback = '-') => {
  if (!value) {
    return fallback;
  }

  return new Date(value).toLocaleDateString();
};
