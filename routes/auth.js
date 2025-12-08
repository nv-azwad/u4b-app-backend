const express = require('express');
const router = express.Router();
const { register, login, getProfile, changePassword } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes (no authentication needed)
router.post('/register', register);
router.post('/login', login);

// Protected routes (authentication required)
router.get('/profile', authenticateToken, getProfile);
router.post('/change-password', authenticateToken, changePassword);

module.exports = router;