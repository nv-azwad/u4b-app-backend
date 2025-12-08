const pool = require('../config/database');

// Get bin by QR code (the main identifier now)
const getBinByCode = async (req, res) => {
  const { binCode } = req.params;

  try {
    // Search by bin_code OR qr_code_id (they're the same)
    const result = await pool.query(
      `SELECT 
        id, 
        bin_code, 
        qr_code_id, 
        site_code, 
        location_name, 
        address, 
        location_code, 
        latitude, 
        longitude, 
        bin_count, 
        status, 
        created_at
       FROM bins 
       WHERE bin_code = $1 OR qr_code_id = $1`,
      [binCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Bin with code ${binCode} not found`
      });
    }

    const bin = result.rows[0];

    res.status(200).json({
      success: true,
      data: bin
    });

  } catch (error) {
    console.error('Get bin by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bin'
    });
  }
};

// Get all bins with enhanced data
const getAllBins = async (req, res) => {
  const { status = 'active', limit = 100, offset = 0 } = req.query;

  try {
    let query = `
      SELECT 
        id, bin_code, qr_code_id, site_code, location_name, 
        address, location_code, latitude, longitude, 
        bin_count, status, created_at
      FROM bins
    `;
    let params = [];

    if (status && status !== 'all') {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ` ORDER BY location_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM bins';
    let countParams = [];
    
    if (status && status !== 'all') {
      countQuery += ' WHERE status = $1';
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);

    res.status(200).json({
      success: true,
      data: {
        bins: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Get all bins error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bins'
    });
  }
};

// Get bins near user location - CRITICAL FOR "FIND NEAREST BIN"
const getBinsNearby = async (req, res) => {
  const { latitude, longitude, radius = 50 } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      message: 'Latitude and longitude are required'
    });
  }

  try {
    // Haversine formula to calculate distance in km
    const query = `
      SELECT *,
        ( 6371 * acos( 
          cos( radians($1) ) * cos( radians( latitude ) )
          * cos( radians( longitude ) - radians($2) ) 
          + sin( radians($1) ) * sin( radians( latitude ) ) 
        ) ) AS distance
      FROM bins
      WHERE status = 'active'
        AND ( 6371 * acos( 
          cos( radians($1) ) * cos( radians( latitude ) )
          * cos( radians( longitude ) - radians($2) ) 
          + sin( radians($1) ) * sin( radians( latitude ) ) 
        ) ) < $3
      ORDER BY distance ASC
      LIMIT 50
    `;

    const result = await pool.query(query, [
      parseFloat(latitude), 
      parseFloat(longitude), 
      parseFloat(radius)
    ]);

    res.status(200).json({
      success: true,
      data: {
        bins: result.rows.map(bin => ({
          ...bin,
          distance: parseFloat(bin.distance).toFixed(2) // Round to 2 decimals
        })),
        searchLocation: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        radiusKm: parseFloat(radius),
        count: result.rows.length
      }
    });

  } catch (error) {
    console.error('Get nearby bins error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while finding nearby bins'
    });
  }
};

// Register a new bin (for future admin panel)
const registerBin = async (req, res) => {
  const { 
    qrCodeId, 
    siteCode, 
    locationName, 
    address, 
    locationCode, 
    latitude, 
    longitude, 
    binCount 
  } = req.body;

  try {
    // Check if bin already exists
    const existing = await pool.query(
      'SELECT * FROM bins WHERE qr_code_id = $1 OR bin_code = $1',
      [qrCodeId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bin with this QR code already exists'
      });
    }

    // Insert new bin
    const result = await pool.query(
      `INSERT INTO bins 
       (bin_code, qr_code_id, site_code, location_name, address, 
        location_code, latitude, longitude, bin_count, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active') 
       RETURNING *`,
      [
        qrCodeId,      // bin_code
        qrCodeId,      // qr_code_id  
        siteCode,
        locationName,
        address,
        locationCode,
        latitude,
        longitude,
        binCount || 1
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Bin registered successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Register bin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while registering bin'
    });
  }
};

// Update bin status
const updateBinStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive', 'maintenance'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be: active, inactive, or maintenance'
    });
  }

  try {
    const result = await pool.query(
      'UPDATE bins SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bin status updated',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update bin status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Delete bin (for future admin panel)
const deleteBin = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if bin has donations
    const donationsCheck = await pool.query(
      'SELECT COUNT(*) FROM donations WHERE bin_id = $1',
      [id]
    );

    if (parseInt(donationsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete bin with existing donations. Set to inactive instead.'
      });
    }

    const result = await pool.query(
      'DELETE FROM bins WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bin deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Delete bin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getAllBins,
  getBinByCode,
  getBinsNearby,
  registerBin,
  updateBinStatus,
  deleteBin
};