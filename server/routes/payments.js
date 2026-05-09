const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const paymentController = require('../controllers/paymentController');
const { validate, schemas } = require('../middleware/validation');

router.get('/payments', asyncHandler(paymentController.getPayments));
router.post('/payments/stkpush', validate(schemas.paymentStk), asyncHandler(paymentController.initiatePaymentStkPush));

// Settings
router.get('/payments/settings', asyncHandler(paymentController.getPaymentSettings));
router.put('/payments/settings', asyncHandler(paymentController.updatePaymentSettings));

// Public/Tenant facing methods
router.get('/payments/methods', asyncHandler(paymentController.getLandlordPaymentMethods));

module.exports = router;
