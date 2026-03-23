const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const reminderController = require('../controllers/reminderController');

router.post('/reminders/generate', asyncHandler(reminderController.generateTenantReminder));

module.exports = router;
