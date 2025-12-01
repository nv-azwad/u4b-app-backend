const pool = require('../config/database');

// Generate unique voucher code
const generateVoucherCode = (partnerName) => {
  const prefix = partnerName.substring(0, 3).toUpperCase();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix + '-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Get available vouchers
const getAvailableVouchers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vouchers WHERE is_active = true ORDER BY id'
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get available vouchers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Check eligibility
const checkEligibility = async (req, res) => {
  const userId = req.user.userId;

  try {
    // 1. Check if user has at least 1 approved donation
    const approvedDonations = await pool.query(
      "SELECT COUNT(*) FROM donations WHERE user_id = $1 AND status = 'approved'",
      [userId]
    );

    const hasApprovedDonation = parseInt(approvedDonations.rows[0].count) > 0;

    // 2. Check if user claimed voucher this month
    const claimedThisMonth = await pool.query(
      `SELECT * FROM claimed_vouchers 
       WHERE user_id = $1 
       AND EXTRACT(MONTH FROM claimed_at) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM claimed_at) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [userId]
    );

    const hasClaimedThisMonth = claimedThisMonth.rows.length > 0;

    res.status(200).json({
      success: true,
      data: {
        canClaim: hasApprovedDonation && !hasClaimedThisMonth,
        hasApprovedDonation,
        hasClaimedThisMonth,
        claimedVoucher: hasClaimedThisMonth ? claimedThisMonth.rows[0] : null
      }
    });

  } catch (error) {
    console.error('Check eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Claim voucher
const claimVoucher = async (req, res) => {
  const userId = req.user.userId;
  const { voucherId } = req.body;

  try {
    // 1. Check eligibility
    const approvedDonations = await pool.query(
      "SELECT COUNT(*) FROM donations WHERE user_id = $1 AND status = 'approved'",
      [userId]
    );

    if (parseInt(approvedDonations.rows[0].count) === 0) {
      return res.status(400).json({
        success: false,
        message: 'You need at least 1 approved donation to claim a voucher'
      });
    }

    // 2. Check if already claimed this month
    const claimedThisMonth = await pool.query(
      `SELECT * FROM claimed_vouchers 
       WHERE user_id = $1 
       AND EXTRACT(MONTH FROM claimed_at) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM claimed_at) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [userId]
    );

    if (claimedThisMonth.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already claimed a voucher this month',
        claimedVoucher: claimedThisMonth.rows[0]
      });
    }

    // 3. Get voucher details
    const voucherResult = await pool.query(
      'SELECT * FROM vouchers WHERE id = $1 AND is_active = true',
      [voucherId]
    );

    if (voucherResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found or inactive'
      });
    }

    const voucher = voucherResult.rows[0];

    // 4. Generate unique code
    const voucherCode = generateVoucherCode(voucher.partner_name);

    // 5. Create claimed voucher record
    const claimedResult = await pool.query(
      'INSERT INTO claimed_vouchers (user_id, voucher_id, voucher_code, claimed_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [userId, voucherId, voucherCode]
    );

    res.status(201).json({
      success: true,
      message: '🎉 Voucher claimed successfully!',
      data: {
        ...claimedResult.rows[0],
        partner_name: voucher.partner_name,
        discount_amount: voucher.discount_amount,
        expiry_date: voucher.expiry_date
      }
    });

  } catch (error) {
    console.error('Claim voucher error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while claiming voucher'
    });
  }
};

// Get user's claimed vouchers
const getMyVouchers = async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT cv.*, v.partner_name, v.description, v.discount_amount, v.expiry_date
       FROM claimed_vouchers cv
       JOIN vouchers v ON cv.voucher_id = v.id
       WHERE cv.user_id = $1
       ORDER BY cv.claimed_at DESC`,
      [userId]
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get my vouchers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getAvailableVouchers,
  checkEligibility,
  claimVoucher,
  getMyVouchers
};