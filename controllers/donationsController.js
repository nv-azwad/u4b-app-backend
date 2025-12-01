const pool = require('../config/database');

// Start a donation session (when QR code is scanned)
const startDonation = async (req, res) => {
  const { binCode } = req.body;
  const userId = req.user.userId; // From JWT token

  try {
    // 1. Find the bin by code
    const binResult = await pool.query(
      'SELECT * FROM bins WHERE bin_code = $1 AND status = $2',
      [binCode, 'active']
    );

    if (binResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found or inactive'
      });
    }

    const bin = binResult.rows[0];

    // 2. Check for recent donations at same bin (prevent spam)
    const recentDonation = await pool.query(
      'SELECT * FROM donations WHERE user_id = $1 AND bin_id = $2 AND scan_timestamp > NOW() - INTERVAL \'2 minutes\'',
      [userId, bin.id]
    );

    if (recentDonation.rows.length > 0) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before making another donation at this bin'
      });
    }

    // 3. Create donation session
    const newDonation = await pool.query(
      'INSERT INTO donations (user_id, bin_id, status, scan_timestamp) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [userId, bin.id, 'pending']
    );

    const donation = newDonation.rows[0];

    res.status(201).json({
      success: true,
      message: 'Donation session created. Please upload media.',
      data: {
        donationId: donation.id,
        binId: bin.id,
        binLocation: bin.location_name,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Start donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while starting donation'
    });
  }
};

// Upload media and verify donation
const uploadMedia = async (req, res) => {
  const { donationId, mediaUrl, latitude, longitude } = req.body;
  const userId = req.user.userId;

  // Check daily donation limit
  try {
    const dailyDonations = await pool.query(
      `SELECT COUNT(*) FROM donations 
       WHERE user_id = $1 
       AND status IN ('confirmed', 'pending_admin', 'approved')
       AND DATE(scan_timestamp) = CURRENT_DATE`,
      [userId]
    );

    if (parseInt(dailyDonations.rows[0].count) >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Daily donation limit reached (5/day). Please try again tomorrow!',
        data: {
          limit: 5,
          nextAvailableDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
        }
      });
    }
  } catch (error) {
    console.error('Daily limit check error:', error);
  }

  try {
    // 1. Get donation details
    const donationResult = await pool.query(
      'SELECT d.*, b.latitude as bin_lat, b.longitude as bin_long FROM donations d JOIN bins b ON d.bin_id = b.id WHERE d.id = $1 AND d.user_id = $2',
      [donationId, userId]
    );

    if (donationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    const donation = donationResult.rows[0];

    // 2. Check if already processed
    if (donation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Donation already processed'
      });
    }

    // 3. Update donation with media info
    await pool.query(
      'UPDATE donations SET media_url = $1, media_latitude = $2, media_longitude = $3, media_timestamp = NOW(), updated_at = NOW() WHERE id = $4',
      [mediaUrl, latitude, longitude, donationId]
    );

    // 4. Auto-verification logic
    const verification = await verifyDonation(donation, latitude, longitude);

    // 5. Update donation status (NO POINTS)
    let status = verification.status;
    let verificationNotes = verification.notes;

    if (status === 'confirmed') {
      // Auto-verification passed - send to admin for manual review
      status = 'pending_admin';
      verificationNotes = 'Passed auto-verification. Awaiting admin review.';
      
      // Update donation count
      await pool.query(
        'UPDATE users SET total_donations_count = total_donations_count + 1, updated_at = NOW() WHERE id = $1',
        [userId]
      );
    }

    // Update donation record (no points)
    await pool.query(
      'UPDATE donations SET status = $1, verification_notes = $2, updated_at = NOW() WHERE id = $3',
      [status, verificationNotes, donationId]
    );

    res.status(200).json({
      success: true,
      message: status === 'pending_admin' ? 'Donation submitted! Our team will review your video shortly.' : 'Donation requires verification',
      data: {
        donationId: donation.id,
        status: status,
        verificationNotes: verificationNotes,
        canClaimVoucher: false,
        nextStep: status === 'pending_admin' ? 'Wait for admin approval' : 'Wait for verification'
      }
    });

  } catch (error) {
    console.error('Upload media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading media'
    });
  }
};

// Auto-verification helper function
const verifyDonation = async (donation, mediaLat, mediaLong) => {
  const checks = {
    locationCheck: false,
    timestampCheck: false
  };

  // 1. Location verification (within 100 meters)
  if (mediaLat && mediaLong && donation.bin_lat && donation.bin_long) {
    const distance = calculateDistance(
      mediaLat, mediaLong,
      donation.bin_lat, donation.bin_long
    );

    if (distance <= 0.1) { // 100 meters = 0.1 km
      checks.locationCheck = true;
    }
  }

  // 2. Timestamp verification (within 2 minutes of scan)
  const scanTime = new Date(donation.scan_timestamp);
  const currentTime = new Date();
  const timeDiff = (currentTime - scanTime) / 1000 / 60; // minutes

  if (timeDiff <= 2) {
    checks.timestampCheck = true;
  }

  // 3. Determine status
  if (checks.locationCheck && checks.timestampCheck) {
    return {
      status: 'confirmed',
      notes: 'Auto-verified: Location and timestamp match'
    };
  } else if (!checks.locationCheck && !checks.timestampCheck) {
    return {
      status: 'rejected',
      notes: 'Failed: Location and timestamp do not match'
    };
  } else {
    return {
      status: 'pending',
      notes: 'Pending manual review: Partial verification'
    };
  }
};

// Calculate distance between two GPS coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c; // Distance in kilometers
};


// Get user's donation history
const getDonationHistory = async (req, res) => {
  const userId = req.user.userId;
  const { limit = 10, offset = 0 } = req.query;

  try {
    const result = await pool.query(
      `SELECT d.id, d.status, d.scan_timestamp, d.media_url, d.verification_notes,
              b.bin_code, b.location_name
       FROM donations d
       JOIN bins b ON d.bin_id = b.id
       WHERE d.user_id = $1
       ORDER BY d.scan_timestamp DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count
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

// Get donation details by ID
const getDonationById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT d.*, b.bin_code, b.location_name, b.latitude as bin_latitude, b.longitude as bin_longitude
       FROM donations d
       JOIN bins b ON d.bin_id = b.id
       WHERE d.id = $1 AND d.user_id = $2`,
      [id, userId]
    );

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

// Add this new function at the end, before module.exports

// Submit donation with video
const submitDonation = async (req, res) => {
  const userId = req.user.userId;
  const { binId, fabricCount, latitude, longitude, accuracy } = req.body;

  // Check if video was uploaded
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Video file is required'
    });
  }

  try {
    // Get bin info
    const binResult = await pool.query(
      'SELECT * FROM bins WHERE id = $1',
      [binId]
    );

    if (binResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found'
      });
    }

    const bin = binResult.rows[0];

    // Calculate distance between user and bin (Haversine formula)
    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);
    const binLat = parseFloat(bin.latitude);
    const binLng = parseFloat(bin.longitude);

    const distance = getDistanceInKm(userLat, userLng, binLat, binLng);

    // Auto-verification: Check if user is within 100 meters of bin
    let verificationNotes = '';
    let status = 'pending_admin'; // Default status

    if (distance <= 0.1) { // 100 meters
      verificationNotes = 'Passed auto-verification: User within 100m of bin';
    } else {
      verificationNotes = `Warning: User is ${(distance * 1000).toFixed(0)}m away from bin`;
    }

    // Create donation record
    const result = await pool.query(
      `INSERT INTO donations (
        user_id, bin_id, media_url, media_latitude, media_longitude,
        media_timestamp, scan_timestamp, status, verification_notes
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7)
      RETURNING *`,
      [
        userId,
        binId,
        `/uploads/${req.file.filename}`, // Relative path to video
        latitude,
        longitude,
        status,
        verificationNotes
      ]
    );

    const donation = result.rows[0];

    // Update user's total donation count
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
        distance: distance
      }
    });

  } catch (error) {
    console.error('Submit donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting donation'
    });
  }
};

// Helper function: Calculate distance between two coordinates
function getDistanceInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
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

// Update module.exports to include new function
module.exports = {
  startDonation,
  uploadMedia,
  getDonationHistory,
  getDonationById,
  submitDonation // ADD THIS
};