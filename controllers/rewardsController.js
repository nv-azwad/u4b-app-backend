const pool = require('../config/database');

// Get all available rewards
const getRewards = async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;

  try {
    const result = await pool.query(
      `SELECT id, title, description, points_required, reward_type, stock, is_active, created_at
       FROM rewards
       WHERE is_active = true
       ORDER BY points_required ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM rewards WHERE is_active = true'
    );

    res.status(200).json({
      success: true,
      data: {
        rewards: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Get rewards error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching rewards'
    });
  }
};

// Get user's balance and donation status
const getBalance = async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      'SELECT id, email, name, email_verified, total_donations_count FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Get total approved donations
    const donationsResult = await pool.query(
      'SELECT COUNT(*) as total_approved FROM donations WHERE user_id = $1 AND status = $2',
      [userId, 'approved']
    );

    // Get total vouchers claimed
    const vouchersResult = await pool.query(
      'SELECT COUNT(*) as total_claimed FROM claimed_vouchers WHERE user_id = $1',
      [userId]
    );

    // Check if user can claim voucher this month
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const voucherThisMonth = await pool.query(
      `SELECT * FROM claimed_vouchers 
       WHERE user_id = $1 
       AND EXTRACT(MONTH FROM claimed_at) = $2 
       AND EXTRACT(YEAR FROM claimed_at) = $3`,
      [userId, currentMonth, currentYear]
    );

    const hasClaimedThisMonth = voucherThisMonth.rows.length > 0;
    
    // Check if user has approved donations this month
    const approvedThisMonth = await pool.query(
      `SELECT * FROM donations 
       WHERE user_id = $1 
       AND status = 'approved'
       AND EXTRACT(MONTH FROM scan_timestamp) = $2 
       AND EXTRACT(YEAR FROM scan_timestamp) = $3`,
      [userId, currentMonth, currentYear]
    );

    const hasApprovedDonation = approvedThisMonth.rows.length > 0;
    const canClaimVoucher = hasApprovedDonation && !hasClaimedThisMonth;

    res.status(200).json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        totalDonations: user.total_donations_count || 0,
        totalApprovedDonations: parseInt(donationsResult.rows[0].total_approved) || 0,
        totalVouchersClaimed: parseInt(vouchersResult.rows[0].total_claimed) || 0,
        emailVerified: user.email_verified,
        canClaimVoucher: canClaimVoucher,
        voucherStatus: {
          hasClaimedThisMonth: hasClaimedThisMonth,
          hasApprovedDonation: hasApprovedDonation,
          nextAvailableDate: hasClaimedThisMonth 
            ? new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
            : 'Available now'
        }
      }
    });

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching balance'
    });
  }
};

// Redeem a reward (DEPRECATED - Keep for backwards compatibility but not used)
const redeemReward = async (req, res) => {
  return res.status(400).json({
    success: false,
    message: 'Points-based rewards are no longer available. Please claim vouchers after approved donations.'
  });
};

// Get user's redemption history
const getRedemptionHistory = async (req, res) => {
  const userId = req.user.userId;
  const { limit = 10, offset = 0 } = req.query;

  try {
    // Get voucher history instead (since we removed rewards table)
    const result = await pool.query(
      `SELECT id, voucher_type, voucher_code, voucher_value, claimed_at, expires_at, status
       FROM claimed_vouchers
       WHERE user_id = $1
       ORDER BY claimed_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM claimed_vouchers WHERE user_id = $1',
      [userId]
    );

    res.status(200).json({
      success: true,
      data: {
        vouchers: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Get redemption history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching redemption history'
    });
  }
};

// Helper function to generate unique redemption code
const generateRedemptionCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

module.exports = {
  getRewards,
  getBalance,
  redeemReward,
  getRedemptionHistory
};