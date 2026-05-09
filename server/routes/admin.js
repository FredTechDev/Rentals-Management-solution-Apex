const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/summary', asyncHandler(adminController.getAdminSummary));
router.get('/organizations', asyncHandler(adminController.getOrganizations));
router.put('/organizations/:id/billing', asyncHandler(adminController.updateOrganizationBilling));
router.get('/logs', asyncHandler(adminController.getAuditLogs));
router.get('/users/pending', asyncHandler(adminController.getPendingUsers));
router.post('/users/:userId/approve', asyncHandler(adminController.approveUser));

module.exports = router;
