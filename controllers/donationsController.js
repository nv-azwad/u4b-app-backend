const pool = require('../config/database');
const { sendDonationNotificationToPIC } = require('../utils/emailSender');

// ==========================================
// 1. GET DONATION HISTORY (Joined with Sites)
// ==========================================
const getDonationHistory = async (req, res) => {
  const userId = req.user.userId;
  const { limit = 10, offset = 0 } = req.query;

  try {
    // UPDATED QUERY: Join bins AND sites to get location name
    const query = `
      SELECT 
        d.id, 
        d.status, 
        d.scan_timestamp, 
        d.media_url, 
        d.verification_notes, 
        d.is_claimed,
        b.bin_id as bin_code,      -- New Schema: bin_id is the code
        s.site_name as location_name -- New Schema: location name is in sites
      FROM donations d
      JOIN bins b ON d.bin_id = b.bin_id
      JOIN sites s ON b.site_id = s.site_id
      WHERE d.user_id = $1
      ORDER BY d.scan_timestamp DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM donations WHERE user_id = $1',
      [userId]
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
    console.error('Get donation history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching donation history'
    });
  }
};

// ==========================================
// 2. GET DONATION BY ID (Joined with Sites)
// ==========================================
const getDonationById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    // UPDATED QUERY: Get lat/long from SITES table
    const query = `
      SELECT 
        d.*, 
        b.bin_id as bin_code, 
        s.site_name as location_name, 
        s.latitude as bin_latitude,    -- Pulled from Sites
        s.longitude as bin_longitude   -- Pulled from Sites
      FROM donations d
      JOIN bins b ON d.bin_id = b.bin_id
      JOIN sites s ON b.site_id = s.site_id
      WHERE d.id = $1 AND d.user_id = $2
    `;

    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get donation by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching donation'
    });
  }
};

// ==========================================
// 3. SUBMIT DONATION (Verify with Site Coords)
// ==========================================
const submitDonation = async (req, res) => {
  const userId = req.user.userId;
  const { binId, fabricCount, latitude, longitude } = req.body; // Removed accuracy if not used

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Video file is required' });
  }

  try {
    // UPDATED QUERY: We must JOIN sites to get the target coordinates for verification
    const binResult = await pool.query(
      `SELECT b.*, s.latitude, s.longitude, s.site_name 
       FROM bins b 
       JOIN sites s ON b.site_id = s.site_id
       WHERE b.bin_id = $1`, // Matches new VARCHAR bin_id
      [binId]
    );

    if (binResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }

    const bin = binResult.rows[0];

    // Distance Calculation
    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);
    const binLat = parseFloat(bin.latitude); // Now valid (comes from sites)
    const binLng = parseFloat(bin.longitude); // Now valid

    const distance = getDistanceInKm(userLat, userLng, binLat, binLng);

    // Verification Logic
    let verificationNotes = '';
    let status = 'pending_admin'; 

    if (distance <= 0.1) { 
      verificationNotes = 'Passed auto-verification: User within 100m of bin';
    } else {
      verificationNotes = `Warning: User is ${(distance * 1000).toFixed(0)}m away from bin`;
    }

    const mediaUrl = req.file.publicUrl; 
    const bags = parseInt(fabricCount) || 1;
    const weightKg = bags * 2;

    // Insert Record
    const result = await pool.query(
      `INSERT INTO donations (
        user_id, bin_id, media_url, media_latitude, media_longitude,
        media_timestamp, scan_timestamp, status, verification_notes, is_claimed, weight_kg
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7, $8, $9)
      RETURNING *`,
      [
        userId,
        binId,
        mediaUrl,
        latitude,
        longitude,
        status,
        verificationNotes,
        false,
        weightKg
      ]
    );

    const donation = result.rows[0];

    // Trigger Email (Background)
    try {
      const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];

      sendDonationNotificationToPIC(
        {
          id: donation.id,
          binCode: bin.bin_id, // Use bin_id as code
          weightKg: weightKg,
          status: status,
          notes: verificationNotes
        },
        user
      );
    } catch (emailErr) {
      console.error("Failed to trigger PIC email:", emailErr);
    }

    await pool.query(
      'UPDATE users SET total_donations_count = total_donations_count + 1 WHERE id = $1',
      [userId]
    );

    res.status(201).json({
      success: true,
      message: 'Donation submitted successfully',
      data: {
        donationId: donation.id,
        status: donation.status,
        verificationNotes: donation.verification_notes,
        distance: distance,
        weightKg: weightKg
      }
    });

  } catch (error) {
    console.error('Submit donation error:', error);
    res.status(500).json({ success: false, message: 'Server error while submitting donation' });
  }
};

// Helper function: Haversine Formula
function getDistanceInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Donation Cooldown Check
const checkEligibility = async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT created_at FROM donations 
       WHERE user_id = $1 
       AND status != 'rejected'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, data: { canDonate: true } });
    }

    const lastDonationDate = new Date(result.rows[0].created_at);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - lastDonationDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const COOLDOWN_DAYS = 30;

    if (diffDays < COOLDOWN_DAYS) {
      const daysRemaining = COOLDOWN_DAYS - diffDays;
      return res.json({ 
        success: true, 
        data: { canDonate: false, daysRemaining: daysRemaining } 
      });
    }

    return res.json({ success: true, data: { canDonate: true } });

  } catch (error) {
    console.error('Check eligibility error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getDonationHistory,
  getDonationById,
  submitDonation, 
  checkEligibility
};