const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Built-in Node module for generating tokens
const { sendEmail } = require('../utils/emailSender'); // Import your new email utility

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Generate JWT token
const generateToken = (userId, email, isAdmin) => {
  return jwt.sign(
    { 
      userId: userId, 
      email: email,
      is_admin: isAdmin || false
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// ==========================================
// ISSUE #2: REGISTRATION & VERIFICATION
// ==========================================

// Register with email + password (UPDATED)
const register = async (req, res) => {
  const { email, password, name, phone } = req.body;

  // Validation
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: 'Email, password, and name are required' });
  }

  if (password.length < 4) {
    return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate Verification Token
    const verificationToken= crypto.randomBytes(32).toString('hex');

    // Create user (is_verified = FALSE by default)
    // We inserted the verification_token into the DB here
    const result = await pool.query(
      `INSERT INTO users 
       (email, name, phone, password_hash, auth_provider, auth_id, created_at, is_verified, verification_token)
       VALUES ($1, $2, $3, $4, 'email', $1, NOW(), FALSE, $5)
       RETURNING id, email, name`,
      [email, name, phone || null, passwordHash, verificationToken]
    );

    // Send Verification Email
    // NOTE: This URL should point to your FRONTEND page, which then calls the backend API
    const verifyUrl = `https://u4b-app--u4bapp.asia-southeast1.hosted.app/verify-email?token=${verificationToken}`;
    
  // HTML Template for Verification
    const verifyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #417FA2; text-align: center;">Welcome to Upcycle4Better!</h2>
        <p style="font-size: 16px; color: #333;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; color: #333;">Thank you for joining us. Please verify your email address to activate your account.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #A0BE6F; color: white; padding: 15px 25px; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 5px; display: inline-block;">Verify Email Account</a>
        </div>
        
        <p style="font-size: 14px; color: #777; margin-top: 30px;">If the button above doesn't work, verify by copying this link into your browser:</p>
        <p style="font-size: 14px; color: #417FA2; word-break: break-all;">${verifyUrl}</p>
      </div>
    `;

    await sendEmail(
      email, 
      "Verify your u4b Account", 
      `Hi ${name}, please verify your email here: ${verifyUrl}`, // Plain text fallback
      verifyHtml // HTML version
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.'
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// Verify Email (NEW)
const verifyEmail = async (req, res) => {
  const { token } = req.query; // Expecting ?token=qy78...

  try {
    // Find user with this token
    const result = await pool.query(
      `UPDATE users 
       SET is_verified = TRUE, verification_token = NULL 
       WHERE verification_token = $1 
       RETURNING *`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification token." });
    }

    res.status(200).json({ success: true, message: "Email verified successfully! You can now login." });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Login (UPDATED)
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // CHECK: Is the email verified?
    if (user.auth_provider === 'email' && !user.is_verified) {
        return res.status(401).json({ success: false, message: "Please verify your email before logging in." });
    }

    // Verify password
    if (!user.password_hash) {
      return res.status(401).json({ success: false, message: 'No password set. Use social login or reset password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate JWT
    const token = generateToken(user.id, user.email, user.is_admin);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_admin: user.is_admin || false
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// ==========================================
// ISSUE #3: FORGOT PASSWORD (OTP)
// ==========================================

// Request OTP (NEW)
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      // Security: Don't reveal if user exists
      return res.json({ success: true, message: "If an account exists, an OTP has been sent." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60000);

    // Save OTP to DB
    await pool.query(
      'UPDATE users SET reset_otp = $1, otp_expires_at = $2 WHERE email = $3',
      [otp, expiresAt, email]
    );

// HTML Template for OTP
    const otpHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #417FA2; text-align: center;">Password Reset Request</h2>
        <p style="font-size: 16px; color: #333;">We received a request to reset your password. Use the code below to proceed:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background-color: #f4f4f4; padding: 10px 20px; border-radius: 5px; border: 1px solid #ddd;">
            ${otp}
          </span>
        </div>
        
        <p style="font-size: 16px; color: #333; text-align: center;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="font-size: 14px; color: #777; margin-top: 30px; text-align: center;">If you did not request this, please ignore this email.</p>
      </div>
    `;

    await sendEmail(
        email, 
        "Password Reset Code", 
        `Your OTP code is: ${otp}. It expires in 10 minutes.`, // Plain text fallback
        otpHtml // HTML version
    );

    res.json({ success: true, message: "If an account exists, an OTP has been sent." });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Reset Password with OTP (NEW)
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    // Validate OTP and Expiry
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND reset_otp = $2 AND otp_expires_at > NOW()',
      [email, otp]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update Password and Clear OTP
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_otp = NULL, otp_expires_at = NULL WHERE email = $2',
      [newPasswordHash, email]
    );

    res.json({ success: true, message: "Password reset successful. You can now login." });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get user profile (Unchanged)
const getProfile = async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query('SELECT id, name, email, phone, total_donations_count, created_at FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Change Password (Authenticated) (Unchanged)
const changePassword = async (req, res) => {
    // ... (Keep your existing changePassword logic here if you want)
    // For brevity, I'm assuming you will copy-paste your existing one back in if needed, 
    // or you can rely on the Reset Password flow above.
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
  
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Missing fields' });
  
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      const user = result.rows[0];
      if (!user.password_hash) return res.status(400).json({ success: false, message: 'No password set' });
  
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) return res.status(401).json({ success: false, message: 'Incorrect current password' });
  
      const newHash = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
      res.status(200).json({ success: true, message: 'Password updated' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
  register,
  verifyEmail,     // New
  login,
  forgotPassword,  // New
  resetPassword,   // New
  getProfile,
  changePassword
};