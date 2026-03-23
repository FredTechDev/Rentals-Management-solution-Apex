const sendError = (res, status, message, extra = {}) => {
  res.status(status).json({ message, ...extra });
};

module.exports = {
  sendError
};
