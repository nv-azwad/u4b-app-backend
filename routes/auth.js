const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    verifyEmail, 
    forgotPassword, 
    resetPassword,
    getProfile, 
    changePassword 
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.get('/verify-email', verifyEmail); // Issue #2
router.post('/login', login);
router.post('/forgot-password', forgotPassword); // Issue #3
router.post('/reset-password', resetPassword);   // Issue #3

// Protected routes (authentication required)
router.get('/profile', authenticateToken, getProfile);
router.post('/change-password', authenticateToken, changePassword);

module.exports = router;