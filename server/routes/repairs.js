const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const repairController = require('../controllers/repairController');
const { repairUpload } = require('../helpers/upload');
const { validate, schemas } = require('../middleware/validation');

router.post('/repairs', repairUpload.single('image'), validate(schemas.repairRequest), asyncHandler(repairController.createRepairRequest));
router.get('/repairs', asyncHandler(repairController.getRepairRequests));
router.put('/repairs/:id', validate(schemas.repairUpdate), asyncHandler(repairController.updateRepairRequest));
router.delete('/repairs/:id', asyncHandler(repairController.deleteRepairRequest));

module.exports = router;
