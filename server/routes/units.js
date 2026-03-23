const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const unitController = require('../controllers/unitController');

const router = express.Router();

router.get('/properties/:propertyId/units', asyncHandler(unitController.getUnitsByProperty));
router.post('/units', asyncHandler(unitController.createUnit));
router.put('/units/:id', asyncHandler(unitController.updateUnit));

module.exports = router;
