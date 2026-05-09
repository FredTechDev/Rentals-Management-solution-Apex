const { hasRole } = require('../helpers/rbac');
const { AppError } = require('./errorHandler');

module.exports = (...allowedRoles) => (req, res, next) => {
  if (!hasRole(req.user, allowedRoles)) {
    return next(new AppError('You do not have permission to access this resource', 403));
  }

  next();
};
