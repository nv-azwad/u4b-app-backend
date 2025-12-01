const pool = require('../config/database');

// Register a new bin (Admin only - we'll add simple check)
const registerBin = async (req, res) => {
  const { binCode, latitude, longitude, locationName } = req.body;

  try {
    // Check if bin code already exists
    const existingBin = await pool.query(
      'SELECT * FROM bins WHERE bin_code = $1',
      [binCode]
    );

    if (existingBin.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bin with this code already exists'
      });
    }

    // Create new bin
    const newBin = await pool.query(
      'INSERT INTO bins (bin_code, latitude, longitude, location_name, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [binCode, latitude, longitude, locationName, 'active']
    );

    const bin = newBin.rows[0];

    res.status(201).json({
      success: true,
      message: 'Bin registered successfully',
      data: {
        id: bin.id,
        binCode: bin.bin_code,
        latitude: bin.latitude,
        longitude: bin.longitude,
        locationName: bin.location_name,
        status: bin.status,
        createdAt: bin.created_at
      }
    });

  } catch (error) {
    console.error('Register bin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while registering bin'
    });
  }
};

// Get all bins (for map view)
const getAllBins = async (req, res) => {
  const { status = 'active', limit = 100, offset = 0 } = req.query;

  try {
    let query = 'SELECT * FROM bins';
    let params = [];

    // Filter by status if provided
    if (status && status !== 'all') {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
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

// Get bin by ID
const getBinById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM bins WHERE id = $1',
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
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get bin by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bin'
    });
  }
};

// Get bin by bin code (used when scanning QR)
const getBinByCode = async (req, res) => {
  const { binCode } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM bins WHERE bin_code = $1',
      [binCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get bin by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bin'
    });
  }
};

// Update bin status (activate/deactivate)
const updateBinStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status
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
      message: 'Bin status updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update bin status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating bin status'
    });
  }
};

// Get bins near a location (for "Find Nearest Bin" feature)
const getBinsNearby = async (req, res) => {
  const { latitude, longitude, radius = 5 } = req.query; // radius in km

  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      message: 'Latitude and longitude are required'
    });
  }

  try {
    // Haversine formula to calculate distance
    const query = `
      SELECT *,
        ( 6371 * acos( cos( radians($1) ) * cos( radians( latitude ) )
        * cos( radians( longitude ) - radians($2) ) + sin( radians($1) )
        * sin( radians( latitude ) ) ) ) AS distance
      FROM bins
      WHERE status = 'active'
        AND ( 6371 * acos( cos( radians($1) ) * cos( radians( latitude ) )
        * cos( radians( longitude ) - radians($2) ) + sin( radians($1) )
        * sin( radians( latitude ) ) ) ) < $3
      ORDER BY distance
      LIMIT 20
    `;

    const result = await pool.query(query, [latitude, longitude, radius]);

    res.status(200).json({
      success: true,
      data: {
        bins: result.rows,
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

// Get bin statistics
const getBinStats = async (req, res) => {
  const { id } = req.params;

  try {
    // Get bin info
    const binResult = await pool.query(
      'SELECT * FROM bins WHERE id = $1',
      [id]
    );

    if (binResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found'
      });
    }

    const bin = binResult.rows[0];

    // Get donation statistics for this bin
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_donations,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_donations,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_donations,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_donations,
        SUM(points_earned) as total_points_awarded
       FROM donations
       WHERE bin_id = $1`,
      [id]
    );

    const stats = statsResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        bin: bin,
        statistics: {
          totalDonations: parseInt(stats.total_donations) || 0,
          confirmedDonations: parseInt(stats.confirmed_donations) || 0,
          pendingDonations: parseInt(stats.pending_donations) || 0,
          rejectedDonations: parseInt(stats.rejected_donations) || 0,
          totalPointsAwarded: parseInt(stats.total_points_awarded) || 0
        }
      }
    });

  } catch (error) {
    console.error('Get bin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bin statistics'
    });
  }
};

module.exports = {
  registerBin,
  getAllBins,
  getBinById,
  getBinByCode,
  updateBinStatus,
  getBinsNearby,
  getBinStats
};