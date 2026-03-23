const { sendError } = require('../helpers/apiResponse');
const { hasRole } = require('../helpers/rbac');

module.exports = (...allowedRoles) => (req, res, next) => {
  if (!hasRole(req.user, allowedRoles)) {
    sendError(res, 403, 'You do not have permission to access this resource');
    return;
  }

  next();
};
