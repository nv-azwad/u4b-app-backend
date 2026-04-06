const pool = require('../config/database');
const { sendDonationApprovedEmail } = require('../utils/emailSender');
const { sendDonationRejectedEmail } = require('../utils/emailSender');

// ==========================================
// 1. GET PENDING DONATIONS (Fix: Join Sites)
// ==========================================
const getPendingDonations = async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;

  try {
    // FIX: We now join 'sites' (s) to get location data
    // FIX: We use 'b.bin_id' instead of 'b.id' based on your new schema
    const result = await pool.query(
      `SELECT 
        d.id, d.status, d.media_url, d.media_latitude, d.media_longitude,
        d.scan_timestamp, d.media_timestamp, d.verification_notes,
        d.created_at, d.updated_at, d.is_claimed,
        u.id as user_id, u.name as user_name, u.email as user_email,
        b.bin_id as bin_code,         -- Updated column name
        s.site_name as location_name, -- Pulled from sites
        s.latitude as bin_latitude,   -- Pulled from sites
        s.longitude as bin_longitude  -- Pulled from sites
       FROM donations d
       JOIN users u ON d.user_id = u.id
       JOIN bins b ON d.bin_id = b.bin_id
       JOIN sites s ON b.site_id = s.site_id
       WHERE d.status = 'pending_admin'
       ORDER BY d.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count (This part was already working)
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM donations WHERE status = 'pending_admin'"
    );

    res.status(200).json({
      success: true,
      data: {
        donations: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Get pending donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pending donations'
    });
  }
};

// ==========================================
// 2. GET ALL DONATIONS (Fix: Join Sites)
// ==========================================
const getAllDonations = async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    // FIX: Updated query to include Sites join here too
    let query = `
      SELECT 
        d.id, d.status, d.media_url, d.scan_timestamp, d.verification_notes,
        d.admin_reviewed, d.reviewed_at,
        u.name as user_name, u.email as user_email,
        b.bin_id as bin_code,
        s.site_name as location_name
       FROM donations d
       JOIN users u ON d.user_id = u.id
       JOIN bins b ON d.bin_id = b.bin_id
       JOIN sites s ON b.site_id = s.site_id
    `;

    const params = [];
    
    if (status && status !== 'all') {
      query += ' WHERE d.status = $1';
      params.push(status);
    }

    query += ' ORDER BY d.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM donations';
    const countParams = [];
    if (status && status !== 'all') {
      countQuery += ' WHERE status = $1';
      countParams.push(status);
    }
    const countResult = await pool.query(countQuery, countParams);

    res.status(200).json({
      success: true,
      data: {
        donations: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Get all donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching donations'
    });
  }
};

// ==========================================
// 3. APPROVE DONATION (No schema changes needed)
// ==========================================
const approveDonation = async (req, res) => {
  const { id } = req.params;
  const { adminNotes } = req.body;
  const adminId = req.user.userId;

  try {
    const donationResult = await pool.query(
      'SELECT * FROM donations WHERE id = $1',
      [id]
    );

    if (donationResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    const donation = donationResult.rows[0];

    if (donation.status !== 'pending_admin') {
      return res.status(400).json({
        success: false,
        message: 'Donation already reviewed',
        currentStatus: donation.status
      });
    }

    await pool.query(
      `UPDATE donations 
       SET status = 'approved', 
           admin_reviewed = true, 
           admin_id = $1, 
           admin_notes = $2, 
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [adminId, adminNotes || 'Approved by admin', id]
    );

    const userResult = await pool.query(
      'SELECT email, name FROM users WHERE id = $1',
      [donation.user_id]
    );
    const user = userResult.rows[0];

    try {
      if (user) {
        await sendDonationApprovedEmail(user.email, user.name);
      }
    } catch (emailErr) {
      console.error("Failed to send approval email:", emailErr);
    }

    res.status(200).json({
      success: true,
      message: 'Donation approved successfully',
      data: {
        donationId: id,
        status: 'approved',
        user: user 
      }
    });

  } catch (error) {
    console.error('Approve donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while approving donation'
    });
  }
};

// ==========================================
// 4. REJECT DONATION (No schema changes needed)
// ==========================================
const rejectDonation = async (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;
  const adminId = req.user.userId;

  if (!rejectionReason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

  try {
    const donationResult = await pool.query('SELECT * FROM donations WHERE id = $1', [id]);
    if (donationResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Donation not found' });
    const donation = donationResult.rows[0];

    if (donation.status !== 'pending_admin') return res.status(400).json({ success: false, message: 'Donation already reviewed', currentStatus: donation.status });

    await pool.query(
      `UPDATE donations 
       SET status = 'rejected', 
           admin_reviewed = true, 
           admin_id = $1, 
           admin_notes = $2, 
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [adminId, rejectionReason, id]
    );

    const userResult = await pool.query('SELECT email, name FROM users WHERE id = $1', [donation.user_id]);
    const user = userResult.rows[0];

    try {
      if (user) {
        await sendDonationRejectedEmail(user.email, user.name, rejectionReason, id);
      }
    } catch (emailErr) {
      console.error("Failed to send rejection email:", emailErr);
    }

    res.status(200).json({
      success: true,
      message: 'Donation rejected',
      data: { donationId: id, status: 'rejected', reason: rejectionReason }
    });

  } catch (error) {
    console.error('Reject donation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==========================================
// 5. GET ADMIN STATS (Count only - works fine)
// ==========================================
const getAdminStats = async (req, res) => {
  try {
    const totalResult = await pool.query('SELECT COUNT(*) FROM donations');
    
    const pendingResult = await pool.query(
      "SELECT COUNT(*) FROM donations WHERE status = 'pending_admin'"
    );
    
    const approvedTodayResult = await pool.query(
      "SELECT COUNT(*) FROM donations WHERE status = 'approved' AND DATE(reviewed_at) = CURRENT_DATE"
    );
    
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');

    const activeUsersResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) FROM donations 
       WHERE status IN ('approved', 'pending_admin')`
    );
    
    const vouchersResult = await pool.query('SELECT COUNT(*) FROM claimed_vouchers');

    res.status(200).json({
      success: true,
      data: {
        totalDonations: parseInt(totalResult.rows[0].count),
        pendingReview: parseInt(pendingResult.rows[0].count),
        approvedToday: parseInt(approvedTodayResult.rows[0].count),
        totalUsers: parseInt(usersResult.rows[0].count),
        totalVouchers: parseInt(vouchersResult.rows[0].count),
        activeUsers: parseInt(activeUsersResult.rows[0].count)
      }
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
};

// ==========================================
// 6. GET ALL USERS
// ==========================================
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, total_donations_count, created_at, is_admin
       FROM users
       ORDER BY created_at DESC`
    );

    res.status(200).json({
      success: true,
      data: {
        users: result.rows
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// ==========================================
// 7. GET USER DETAILS (Fix: Join Sites)
// ==========================================
const getUserDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const userResult = await pool.query(
      `SELECT id, name, email, phone, total_donations_count, created_at, is_admin
       FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // FIX: Updated query to use new Bins/Sites schema
    const donationsResult = await pool.query(
      `SELECT d.id, d.status, d.scan_timestamp, s.site_name as location_name
       FROM donations d
       JOIN bins b ON d.bin_id = b.bin_id
       JOIN sites s ON b.site_id = s.site_id
       WHERE d.user_id = $1
       ORDER BY d.scan_timestamp DESC`,
      [id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...userResult.rows[0],
        donations: donationsResult.rows
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user details'
    });
  }
};

module.exports = {
  getPendingDonations,
  getAllDonations,
  approveDonation,
  rejectDonation,
  getAdminStats,
  getAllUsers,        
  getUserDetails      
};