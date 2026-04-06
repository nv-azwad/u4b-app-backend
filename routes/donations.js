const express = require('express');
const router = express.Router();
const {
  getDonationHistory,
  getDonationById,
  submitDonation,
  checkEligibility
} = require('../controllers/donationsController');
const { authenticateToken } = require('../middleware/auth');

// Routes
const { upload, uploadToGCS } = require('../middleware/upload');

// Update the route
router.post('/submit', 
  authenticateToken, 
  upload.single('video'), 
  uploadToGCS,
  submitDonation
);
router.get('/history', authenticateToken, getDonationHistory);
router.get('/my-donations', authenticateToken, getDonationHistory);
router.get('/check-eligibility', authenticateToken, checkEligibility);

// Dynamic route last
router.get('/:id', authenticateToken, getDonationById);

module.exports = router;