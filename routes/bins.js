const express = require('express');
const router = express.Router();
const {
  getAllBins,
  getBinByCode,
  updateBinStatus,
  getBinsNearby,
} = require('../controllers/binsController');
const { authenticateToken } = require('../middleware/auth');

// Public routes (no authentication needed)
router.get('/', getAllBins);
router.get('/nearby', getBinsNearby);
router.get('/code/:binCode', getBinByCode);

// Protected routes (authentication required)
router.patch('/:id/status', authenticateToken, updateBinStatus);

module.exports = router;