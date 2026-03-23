const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.get('/properties/available', asyncHandler(authController.getAvailableProperties));
router.get('/me', authMiddleware, asyncHandler(authController.getCurrentUser));
router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));

module.exports = router;
