const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const suggestionController = require('../controllers/suggestionController');
const { validate, schemas } = require('../middleware/validation');

router.post('/suggestions', validate(schemas.suggestion), asyncHandler(suggestionController.createSuggestion));
router.get('/suggestions', asyncHandler(suggestionController.getSuggestions));

module.exports = router;
