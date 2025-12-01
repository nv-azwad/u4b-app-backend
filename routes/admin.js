const express = require('express');
const router = express.Router();
const {
  getPendingDonations,
  getAllDonations,
  approveDonation,
  rejectDonation,
  getAdminStats,
  getAllUsers,        // ADD THIS to imports
  getUserDetails      // ADD THIS to imports
} = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');

// All admin routes require authentication AND admin privileges
router.get('/donations/pending', authenticateToken, checkAdmin, getPendingDonations);
router.get('/donations', authenticateToken, checkAdmin, getAllDonations);
router.post('/donations/:id/approve', authenticateToken, checkAdmin, approveDonation);
router.post('/donations/:id/reject', authenticateToken, checkAdmin, rejectDonation);
router.get('/stats', authenticateToken, checkAdmin, getAdminStats);
router.get('/users', authenticateToken, checkAdmin, getAllUsers);
router.get('/users/:id/donations', authenticateToken, checkAdmin, getUserDetails);

module.exports = router;