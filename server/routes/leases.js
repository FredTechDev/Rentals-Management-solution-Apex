const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const { leaseUpload } = require('../helpers/upload');
const leaseController = require('../controllers/leaseController');

router.post('/leases/upload', leaseUpload.single('lease'), asyncHandler(leaseController.uploadLease));
router.get('/leases/tenant', asyncHandler(leaseController.getTenantLease));
router.get('/leases/landlord', asyncHandler(leaseController.getLandlordLeases));
router.get('/leases/view/:id', asyncHandler(leaseController.viewLease));

module.exports = router;
