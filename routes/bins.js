const express = require('express');
const router = express.Router();
const {
  registerBin,
  getAllBins,
  getBinById,
  getBinByCode,
  updateBinStatus,
  getBinsNearby,
  getBinStats
} = require('../controllers/binsController');
const { authenticateToken } = require('../middleware/auth');

// Public routes (no authentication needed)
router.get('/', getAllBins);
router.get('/nearby', getBinsNearby);
router.get('/code/:binCode', getBinByCode);
router.get('/:id', getBinById);
router.get('/:id/stats', getBinStats);

// Protected routes (authentication required - for admin/users)
router.post('/register', authenticateToken, registerBin);
router.patch('/:id/status', authenticateToken, updateBinStatus);

module.exports = router; 