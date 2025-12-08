const express = require('express');
const router = express.Router();
const {
  registerBin,
  getAllBins,
  getBinByCode,
  updateBinStatus,
  getBinsNearby,
  deleteBin
} = require('../controllers/binsController');
const { authenticateToken } = require('../middleware/auth');

// Public routes (no authentication needed)
router.get('/', getAllBins);
router.get('/nearby', getBinsNearby);
router.get('/code/:binCode', getBinByCode);

// Protected routes (authentication required)
router.post('/register', authenticateToken, registerBin);
router.patch('/:id/status', authenticateToken, updateBinStatus);
router.delete('/:id', authenticateToken, deleteBin);

module.exports = router;