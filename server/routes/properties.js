const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const propertyController = require('../controllers/propertyController');

router.get('/properties', asyncHandler(propertyController.getProperties));
router.post('/properties', asyncHandler(propertyController.createProperty));
router.put('/properties/:id', asyncHandler(propertyController.updateProperty));
router.get('/properties/:id/tenants', asyncHandler(propertyController.getPropertyTenants));
router.post('/tenants', asyncHandler(propertyController.createTenant));
router.get('/pending-registrations', asyncHandler(propertyController.getPendingRegistrations));
router.post('/approve-registration/:userId', asyncHandler(propertyController.approveRegistration));
router.post('/reject-registration/:userId', asyncHandler(propertyController.rejectRegistration));

module.exports = router;
