const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/summary', asyncHandler(adminController.getAdminSummary));
router.get('/organizations', asyncHandler(adminController.getOrganizations));
router.get('/logs', asyncHandler(adminController.getAuditLogs));

module.exports = router;
