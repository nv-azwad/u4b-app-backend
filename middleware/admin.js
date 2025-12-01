// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
  // First check if user is authenticated (from auth middleware)
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Then check if user is admin
  const pool = require('../config/database');
  
  pool.query(
    'SELECT is_admin FROM users WHERE id = $1',
    [req.user.userId]
  )
  .then(result => {
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    
    if (!user.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access only'
      });
    }

    // User is admin, continue
    next();
  })
  .catch(error => {
    console.error('Admin check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  });
};

module.exports = { checkAdmin };