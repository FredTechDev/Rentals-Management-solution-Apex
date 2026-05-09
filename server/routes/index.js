const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const authMiddleware = require('../middleware/auth');
const { apiRateLimiter } = require('../middleware/rateLimiter');
const authorize = require('../middleware/authorize');
const { tenantResolver } = require('../middleware/tenantResolver');
const paymentController = require('../controllers/paymentController');
const { ROLES } = require('../helpers/rbac');
const adminRoutes = require('./admin');
const authRoutes = require('./auth');
const billingRoutes = require('./billing');
const leaseRoutes = require('./leases');
const messageRoutes = require('./messages');
const notificationRoutes = require('./notifications');
const paymentRoutes = require('./payments');
const propertyRoutes = require('./properties');
const reminderRoutes = require('./reminders');
const repairRoutes = require('./repairs');
const suggestionRoutes = require('./suggestions');
const unitRoutes = require('./units');

const router = express.Router();

const webhookController = require('../controllers/webhookController');

router.use('/auth', authRoutes);
router.post('/webhooks/paystack', asyncHandler(webhookController.handlePaystackWebhook));
router.post('/payments/callback', asyncHandler(paymentController.handleMpesaCallback));
router.use(apiRateLimiter);
router.use(authMiddleware);
router.use('/admin', authorize(ROLES.SUPER_ADMIN), adminRoutes);
router.use('/billing', tenantResolver, billingRoutes);
router.use(tenantResolver);
router.use(propertyRoutes);
router.use(unitRoutes);
router.use(reminderRoutes);
router.use(messageRoutes);
router.use(repairRoutes);
router.use(paymentRoutes);
router.use(leaseRoutes);
router.use(suggestionRoutes);
router.use(notificationRoutes);

module.exports = router;
