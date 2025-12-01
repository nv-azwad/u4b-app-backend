const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT token with is_admin flag
const generateToken = (userId, email, isAdmin) => {
  return jwt.sign(
    { 
      userId, 
      email,
      is_admin: isAdmin 
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: '30d' }
  );
};

// Sign up / Register new user
const signup = async (req, res) => {
  const { email, name, phone, authProvider, authId } = req.body;

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR auth_id = $2',
      [email, authId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }

    // Create new user (is_admin defaults to false)
    const newUser = await pool.query(
      'INSERT INTO users (email, name, phone, auth_provider, auth_id, total_donations_count, is_admin) VALUES ($1, $2, $3, $4, $5, 0, false) RETURNING *',
      [email, name, phone, authProvider, authId]
    );

    const user = newUser.rows[0];
    const token = generateToken(user.id, user.email, user.is_admin);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          is_admin: user.is_admin,
          total_donations_count: user.total_donations_count
        },
        token
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during signup' 
    });
  }
};

// Login existing user
const login = async (req, res) => {
  const { email, authId, authProvider } = req.body;

  try {
    // Find user by email only (since we're using email as login)
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found. Please sign up first.' 
      });
    }

    const user = result.rows[0];
    const token = generateToken(user.id, user.email, user.is_admin);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          is_admin: user.is_admin,
          total_donations_count: user.total_donations_count
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
};
// Get user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT token

    const result = await pool.query(
      'SELECT id, email, name, phone, is_admin, total_donations_count, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

module.exports = {
  signup,
  login,
  getProfile
};