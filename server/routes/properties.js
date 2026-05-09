const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const propertyController = require('../controllers/propertyController');
const { validate, schemas } = require('../middleware/validation');

router.get('/properties', asyncHandler(propertyController.getProperties));
router.post('/properties', validate(schemas.createProperty), asyncHandler(propertyController.createProperty));
router.put('/properties/:id', validate(schemas.updateProperty), asyncHandler(propertyController.updateProperty));
router.delete('/properties/:id', asyncHandler(propertyController.deleteProperty));
router.get('/properties/:id/tenants', asyncHandler(propertyController.getPropertyTenants));
router.post('/tenants', validate(schemas.createTenant), asyncHandler(propertyController.createTenant));
router.get('/pending-registrations', asyncHandler(propertyController.getPendingRegistrations));
router.post('/approve-registration/:userId', validate(schemas.approveRegistration), asyncHandler(propertyController.approveRegistration));
router.post('/reject-registration/:userId', asyncHandler(propertyController.rejectRegistration));

module.exports = router;
