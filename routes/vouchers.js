const express = require('express');
const router = express.Router();
const {
  getAvailableVouchers,
  checkEligibility,
  claimVoucher,
  getMyVouchers
} = require('../controllers/vouchersController');
const { authenticateToken } = require('../middleware/auth');

// Get available vouchers
router.get('/available', authenticateToken, getAvailableVouchers);

// Check if user can claim
router.get('/check-eligibility', authenticateToken, checkEligibility);

// Claim voucher
router.post('/claim', authenticateToken, claimVoucher);

// Get user's claimed vouchers
router.get('/my-vouchers', authenticateToken, getMyVouchers);

module.exports = router;