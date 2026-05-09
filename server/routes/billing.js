const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const billingController = require('../controllers/billingController');

router.get('/my-billing', asyncHandler(billingController.getMyBilling));
router.post('/pay-subscription', asyncHandler(billingController.initializeSubscriptionPayment));

module.exports = router;
