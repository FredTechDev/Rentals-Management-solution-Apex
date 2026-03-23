const express = require('express');
const router = express.Router();
const asyncHandler = require('../helpers/asyncHandler');
const repairController = require('../controllers/repairController');
const { repairUpload } = require('../helpers/upload');

router.post('/repairs', repairUpload.single('image'), asyncHandler(repairController.createRepairRequest));
router.get('/repairs', asyncHandler(repairController.getRepairRequests));
router.put('/repairs/:id', asyncHandler(repairController.updateRepairRequest));

module.exports = router;
