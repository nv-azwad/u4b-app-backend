const express = require('express');
const router = express.Router();
const { signup, login, getProfile } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes (no authentication needed)
router.post('/signup', signup);
router.post('/login', login);

// Protected routes (authentication required)
router.get('/profile', authenticateToken, getProfile);

module.exports = router;