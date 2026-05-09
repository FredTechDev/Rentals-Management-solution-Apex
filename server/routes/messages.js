const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const messageController = require('../controllers/messageController');
const { validate, schemas } = require('../middleware/validation');

router.get('/messages', asyncHandler(messageController.getMessages));
router.post('/messages', validate(schemas.message), asyncHandler(messageController.createMessage));
router.post('/messages/toggle-global', asyncHandler(messageController.toggleGlobalChat));

module.exports = router;
