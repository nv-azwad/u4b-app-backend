const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload'); // ADD THIS
const {
  startDonation,
  uploadMedia,
  getDonationHistory,
  getDonationById,
  submitDonation // ADD THIS
} = require('../controllers/donationsController');
const { authenticateToken } = require('../middleware/auth');

// Routes
router.post('/start', authenticateToken, startDonation);
router.post('/upload', authenticateToken, uploadMedia);
router.get('/history', authenticateToken, getDonationHistory);
router.get('/my-donations', authenticateToken, getDonationHistory);

// NEW: Submit donation with video upload
router.post('/submit', authenticateToken, upload.single('video'), submitDonation); // ADD THIS

// Dynamic route last
router.get('/:id', authenticateToken, getDonationById);

module.exports = router;