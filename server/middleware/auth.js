const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { User } = require('../models');
const { ROLES } = require('../helpers/rbac');
const { AppError } = require('./errorHandler');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      throw new AppError('Invalid token', 401);
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.is_active) {
      throw new AppError('User not found or inactive', 401);
    }

    if (user.requires_password_change && req.path !== '/change-password' && req.path !== '/auth/change-password') {
      throw new AppError('Password change required before accessing the system', 403, 'PASSWORD_CHANGE_REQUIRED');
    }

    const tokenOrganizationId = Object.prototype.hasOwnProperty.call(decoded, 'organizationId')
      ? decoded.organizationId
      : undefined;
    req.organizationId = user.role === ROLES.SUPER_ADMIN
      ? (tokenOrganizationId || null)
      : (tokenOrganizationId || user.organization_id || null);
    req.user = User.sanitize({ ...user, organization_id: req.organizationId });
    req.userId = user.id;
    req.homeOrganizationId = user.organization_id || null;
    next();
  } catch (err) {
    next(err);
  }
};

const optionalAuth = async (req, res, next) => {
  if (!req.headers.authorization) return next();
  return auth(req, res, next);
};

module.exports = auth;
module.exports.optionalAuth = optionalAuth;
