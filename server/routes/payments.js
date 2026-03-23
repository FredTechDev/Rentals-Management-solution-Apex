const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const paymentController = require('../controllers/paymentController');

router.get('/payments', asyncHandler(paymentController.getPayments));
router.post('/payments/stkpush', asyncHandler(paymentController.initiatePaymentStkPush));

module.exports = router;
