const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.get('/notifications', asyncHandler(notificationController.getNotifications));
router.patch('/notifications/:id/read', asyncHandler(notificationController.markNotificationRead));

module.exports = router;
