const express = require('express');
const router = express.Router();
const {
  getRewards,
  getBalance,
  redeemReward,
  getRedemptionHistory
} = require('../controllers/rewardsController');
const { authenticateToken } = require('../middleware/auth');

// All rewards routes require authentication
router.get('/', authenticateToken, getRewards);
router.get('/balance', authenticateToken, getBalance);
router.post('/redeem', authenticateToken, redeemReward);
router.get('/history', authenticateToken, getRedemptionHistory);

module.exports = router;