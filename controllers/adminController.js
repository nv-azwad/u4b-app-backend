const pool = require('../config/database');

// Get all pending donations for admin review
const getPendingDonations = async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;

  try {
    const result = await pool.query(
      `SELECT 
        d.id, d.status, d.media_url, d.media_latitude, d.media_longitude,
        d.scan_timestamp, d.media_timestamp, d.verification_notes,
        d.created_at, d.updated_at,
        u.id as user_id, u.name as user_name, u.email as user_email,
        b.bin_code, b.location_name, b.latitude as bin_latitude, b.longitude as bin_longitude
       FROM donations d
       JOIN users u ON d.user_id = u.id
       JOIN bins b ON d.bin_id = b.id
       WHERE d.status = 'pending_admin'
       ORDER BY d.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count
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

// Get all donations with any status (for admin overview)
const getAllDonations = async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    let query = `
      SELECT 
        d.id, d.status, d.media_url, d.scan_timestamp, d.verification_notes,
        d.admin_reviewed, d.reviewed_at,
        u.name as user_name, u.email as user_email,
        b.bin_code, b.location_name
       FROM donations d
       JOIN users u ON d.user_id = u.id
       JOIN bins b ON d.bin_id = b.id
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

// Approve a donation
const approveDonation = async (req, res) => {
  const { id } = req.params;
  const { adminNotes } = req.body;
  const adminId = req.user.userId;

  try {
    // 1. Get donation details
    const donationResult = await pool.query(
      'SELECT * FROM donations WHERE id = $1',
      [id]
    );

    if (donationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    const donation = donationResult.rows[0];

    // 2. Check if already reviewed
    if (donation.status !== 'pending_admin') {
      return res.status(400).json({
        success: false,
        message: 'Donation already reviewed',
        currentStatus: donation.status
      });
    }

    // 3. Update donation to approved
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

    // 4. Get user info for notification (optional - we'll add notifications later)
    const userResult = await pool.query(
      'SELECT email, name FROM users WHERE id = $1',
      [donation.user_id]
    );

    res.status(200).json({
      success: true,
      message: 'Donation approved successfully',
      data: {
        donationId: id,
        status: 'approved',
        user: userResult.rows[0]
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

// Reject a donation
const rejectDonation = async (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;
  const adminId = req.user.userId;

  if (!rejectionReason) {
    return res.status(400).json({
      success: false,
      message: 'Rejection reason is required'
    });
  }

  try {
    // 1. Get donation details
    const donationResult = await pool.query(
      'SELECT * FROM donations WHERE id = $1',
      [id]
    );

    if (donationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    const donation = donationResult.rows[0];

    // 2. Check if already reviewed
    if (donation.status !== 'pending_admin') {
      return res.status(400).json({
        success: false,
        message: 'Donation already reviewed',
        currentStatus: donation.status
      });
    }

    // 3. Update donation to rejected
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

    res.status(200).json({
      success: true,
      message: 'Donation rejected',
      data: {
        donationId: id,
        status: 'rejected',
        reason: rejectionReason
      }
    });

  } catch (error) {
    console.error('Reject donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rejecting donation'
    });
  }
};

// Get admin statistics
const getAdminStats = async (req, res) => {
  try {
    // Total donations
    const totalResult = await pool.query('SELECT COUNT(*) FROM donations');
    
    // Pending review
    const pendingResult = await pool.query(
      "SELECT COUNT(*) FROM donations WHERE status = 'pending_admin'"
    );
    
    // Approved today
    const approvedTodayResult = await pool.query(
      "SELECT COUNT(*) FROM donations WHERE status = 'approved' AND DATE(reviewed_at) = CURRENT_DATE"
    );
    
    // Total users
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    
    // Total vouchers claimed
    const vouchersResult = await pool.query('SELECT COUNT(*) FROM claimed_vouchers');

    res.status(200).json({
      success: true,
      data: {
        totalDonations: parseInt(totalResult.rows[0].count),
        pendingReview: parseInt(pendingResult.rows[0].count),
        approvedToday: parseInt(approvedTodayResult.rows[0].count),
        totalUsers: parseInt(usersResult.rows[0].count),
        totalVouchers: parseInt(vouchersResult.rows[0].count)
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

module.exports = {
  getPendingDonations,
  getAllDonations,
  approveDonation,
  rejectDonation,
  getAdminStats
};