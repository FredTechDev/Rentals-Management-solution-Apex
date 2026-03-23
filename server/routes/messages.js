const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const messageController = require('../controllers/messageController');

router.get('/messages', asyncHandler(messageController.getMessages));
router.post('/messages', asyncHandler(messageController.createMessage));

module.exports = router;
