const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { tenantResolver } = require('../middleware/tenantResolver');

const { optionalAuth } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../helpers/rbac');

router.get('/properties/available', optionalAuth, asyncHandler(authController.getAvailableProperties));
router.get('/me', authMiddleware, asyncHandler(authController.getCurrentUser));
router.post('/register', validate(schemas.register), asyncHandler(authController.register));
router.post('/inquiry', validate(schemas.inquiry), asyncHandler(authController.submitInquiry));
router.post('/login', validate(schemas.login), asyncHandler(authController.login));
router.post('/change-password', authMiddleware, asyncHandler(authController.changePassword));

// Staff management
router.get('/staff', authMiddleware, tenantResolver, authorize(ROLES.LANDLORD, ROLES.SUPER_ADMIN), asyncHandler(authController.getOrganizationStaff));
router.post('/staff', authMiddleware, tenantResolver, authorize(ROLES.LANDLORD, ROLES.SUPER_ADMIN), validate(schemas.register), asyncHandler(authController.addOrganizationStaff));

module.exports = router;
