const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const suggestionController = require('../controllers/suggestionController');

router.post('/suggestions', asyncHandler(suggestionController.createSuggestion));
router.get('/suggestions', asyncHandler(suggestionController.getSuggestions));

module.exports = router;
