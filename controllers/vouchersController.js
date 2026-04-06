const pool = require('../config/database');

// NOTE: Add these to your .env file later!
const WIX_U4B_URL = process.env.WIX_U4B_API_URL; 
const WIX_BB_URL = process.env.WIX_BB_API_URL;

// Helper to call Wix API
async function fetchWixPromoCode(url) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Wix API Error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Unknown error from Wix');
  }

  return data.code; 
}

// Get available vouchers
const getAvailableVouchers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vouchers WHERE is_active = true ORDER BY id'
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get available vouchers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Check eligibility (UPDATED: Checks for UNCLAIMED approved donations)
const checkEligibility = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Count donations that are APPROVED but NOT YET CLAIMED
    const availableDonations = await pool.query(
      `SELECT COUNT(*) FROM donations 
       WHERE user_id = $1 
       AND status = 'approved' 
       AND is_claimed = false`, // <--- The new check
      [userId]
    );
    
    const count = parseInt(availableDonations.rows[0].count);

    res.status(200).json({
      success: true,
      data: {
        canClaim: count > 0,
        availableCount: count, // Send this so frontend knows how many they have
        hasApprovedDonation: count > 0,
        hasClaimedThisMonth: false,
        claimedVoucher: null
      }
    });

  } catch (error) {
    console.error('Check eligibility error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// controllers/vouchersController.js

const claimVoucher = async (req, res) => {
  const userId = req.user.userId;
  const { voucherId } = req.body; 

  console.log(`--- STARTING CLAIM FOR USER ${userId} ---`);

  // We use a dedicated client for transactions
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Start Transaction

    // 1. SEARCH FOR DONATION
    console.log('Step 1: Searching for an eligible donation...');
    const donationCheck = await client.query(
      `SELECT id, status, is_claimed FROM donations 
       WHERE user_id = $1 
       AND status = 'approved' 
       AND is_claimed = false 
       ORDER BY created_at ASC 
       LIMIT 1
       FOR UPDATE`, // Locks the row so no one else can touch it
      [userId]
    );

    if (donationCheck.rows.length === 0) {
      console.log('ERROR: No eligible donation found.');
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'No available approved donations found.' });
    }

    const donationIdToUse = donationCheck.rows[0].id;
    console.log(`SUCCESS: Found Donation ID ${donationIdToUse}. Locking it.`);

    // 2. CHECK VOUCHER
    const voucherResult = await client.query(
      'SELECT * FROM vouchers WHERE id = $1 AND is_active = true',
      [voucherId]
    );

    if (voucherResult.rows.length === 0) {
      console.log('ERROR: Voucher invalid or inactive.');
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Voucher not found.' });
    }
    const voucher = voucherResult.rows[0];

    // 3. GET CODE FROM WIX
    // (Assuming fetchWixPromoCode is defined above in your file)
    let generatedCode = 'TEST-CODE-' + Date.now(); // Fallback for debugging if API fails
    try {
        const partnerName = voucher.partner_name || 'U4B';
        if (partnerName.toLowerCase().includes('best bundle') && WIX_BB_URL) {
            generatedCode = await fetchWixPromoCode(WIX_BB_URL);
        } else if (WIX_U4B_URL) {
            generatedCode = await fetchWixPromoCode(WIX_U4B_URL);
        }
    } catch (err) {
        console.error("Wix API Warning:", err.message);
        // We continue with generatedCode to test DB logic
    }

    // 4. PERFORM UPDATES
    console.log(`Step 4: Updating Donation ${donationIdToUse} to is_claimed = true`);
    
    // DEBUG: Check before update
    // const checkBefore = await client.query('SELECT is_claimed FROM donations WHERE id = $1', [donationIdToUse]);
    // console.log('DEBUG: Status before update:', checkBefore.rows[0]);

    const updateResult = await client.query(
      'UPDATE donations SET is_claimed = true WHERE id = $1 RETURNING *',
      [donationIdToUse]
    );
    
    if (updateResult.rows.length === 0) {
         console.log('CRITICAL ERROR: Update query ran but returned no rows. Did the ID disappear?');
    } else {
         console.log('DEBUG: Update successful. New state:', updateResult.rows[0]);
    }

    console.log(`Step 5: Inserting Claimed Voucher linked to Donation ${donationIdToUse}`);
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 3);

    const claimedResult = await client.query(
      `INSERT INTO claimed_vouchers 
       (user_id, voucher_id, voucher_code, claimed_at, expiry_date, donation_id) 
       VALUES ($1, $2, $3, NOW(), $4, $5) 
       RETURNING *`,
      [userId, voucherId, generatedCode, expiryDate, donationIdToUse]
    );

    console.log('DEBUG: Insert result:', claimedResult.rows[0]);

    await client.query('COMMIT'); // Commit Transaction
    console.log('--- TRANSACTION COMMITTED SUCCESSFULLY ---');

    res.status(201).json({
      success: true,
      message: '🎉 Voucher claimed successfully!',
      data: {
        ...claimedResult.rows[0],
        partner_name: voucher.partner_name,
        discount_amount: voucher.discount_amount
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('!!! TRANSACTION FAILED - ROLLED BACK !!!', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while claiming voucher'
    });
  } finally {
    client.release();
  }
};

// Get my vouchers (UPDATED: Returns linked donation ID)
const getMyVouchers = async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      `SELECT cv.id, cv.voucher_code, cv.claimed_at, cv.expiry_date, cv.donation_id,
              v.partner_name, v.description, v.discount_amount 
       FROM claimed_vouchers cv
       JOIN vouchers v ON cv.voucher_id = v.id
       WHERE cv.user_id = $1
       ORDER BY cv.claimed_at DESC`,
      [userId]
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get my vouchers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAvailableVouchers,
  checkEligibility,
  claimVoucher,
  getMyVouchers
};