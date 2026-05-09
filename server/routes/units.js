const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const unitController = require('../controllers/unitController');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

router.get('/properties/:propertyId/units', asyncHandler(unitController.getUnitsByProperty));
router.post('/units', validate(schemas.createUnit), asyncHandler(unitController.createUnit));
router.put('/units/:id', validate(schemas.updateUnit), asyncHandler(unitController.updateUnit));

module.exports = router;
