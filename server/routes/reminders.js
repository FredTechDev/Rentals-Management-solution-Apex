const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const reminderController = require('../controllers/reminderController');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../helpers/rbac');

router.use('/reminders', authorize(ROLES.LANDLORD, ROLES.PROPERTY_MANAGER, ROLES.SUPER_ADMIN));

router.post('/reminders/toggle', asyncHandler(reminderController.toggleAutoReminders));
router.post('/reminders/settings', asyncHandler(reminderController.updateReminderSettings));
router.post('/reminders/manual', asyncHandler(reminderController.triggerManualReminder));
router.post('/reminders/trigger-all', asyncHandler(reminderController.triggerAllReminders));

module.exports = router;
