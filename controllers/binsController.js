const pool = require('../config/database');

// ==========================================
// 1. GET BIN BY CODE (Search + Join)
// ==========================================
const getBinByCode = async (req, res) => {
  const { binCode } = req.params;

  try {
    // Search by bin_id (short code) OR bin_qr_code (full URL)
    // We Join with Sites to get the address
    const query = `
      SELECT 
        b.bin_id as id,
        b.bin_id as bin_code,
        b.bin_qr_code as qr_code_id,
        b.active_inactive as status,
        b.bin_type,
        s.site_id as site_code,
        s.site_id as location_code,
        s.site_name as location_name,
        s.site_address as address,
        s.latitude,
        s.longitude,
        1 as bin_count
      FROM bins b
      JOIN sites s ON b.site_id = s.site_id
      WHERE b.bin_id = $1 OR b.bin_qr_code = $1
    `;

    const result = await pool.query(query, [binCode]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Bin with code ${binCode} not found`
      });
    }

    // Normalize data for frontend (e.g., status to lowercase)
    const bin = result.rows[0];
    if (bin.status) bin.status = bin.status.toLowerCase();

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

// ==========================================
// 2. GET ALL BINS (List View)
// ==========================================
const getAllBins = async (req, res) => {
  const { status = 'active', limit = 100, offset = 0 } = req.query;

  try {
    let query = `
      SELECT 
        b.bin_id as id,
        b.bin_id as bin_code,
        b.bin_qr_code as qr_code_id,
        b.active_inactive as status,
        s.site_id as site_code,
        s.site_id as location_code,
        s.site_name as location_name,
        s.site_address as address,
        s.latitude,
        s.longitude,
        1 as bin_count
      FROM bins b
      JOIN sites s ON b.site_id = s.site_id
    `;
    
    let params = [];

    // Filter by Status (Case Insensitive logic)
    if (status && status !== 'all') {
      // We use LOWER() because DB has 'ACTIVE' but query might be 'active'
      query += ' WHERE LOWER(b.active_inactive) = LOWER($1)';
      params.push(status);
    }

    query += ` ORDER BY s.site_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM bins b';
    let countParams = [];
    if (status && status !== 'all') {
      countQuery += ' WHERE LOWER(b.active_inactive) = LOWER($1)';
      countParams.push(status);
    }
    const countResult = await pool.query(countQuery, countParams);

    // Format rows
    const formattedRows = result.rows.map(row => ({
      ...row,
      status: row.status ? row.status.toLowerCase() : 'unknown'
    }));

    res.status(200).json({
      success: true,
      data: {
        bins: formattedRows,
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

// ==========================================
// 3. GET NEARBY BINS (Geospatial)
// ==========================================
const getBinsNearby = async (req, res) => {
  const { latitude, longitude, radius = 50 } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      message: 'Latitude and longitude are required'
    });
  }

  try {
    // Haversine formula on SITES table, joined with BINS
    const query = `
      SELECT 
        b.bin_id as id,
        b.bin_id as bin_code,
        b.bin_qr_code as qr_code_id,
        b.active_inactive as status,
        s.site_id as site_code,
        s.site_name as location_name,
        s.site_address as address,
        s.latitude,
        s.longitude,
        ( 6371 * acos( 
          cos( radians($1) ) * cos( radians( s.latitude ) )
          * cos( radians( s.longitude ) - radians($2) ) 
          + sin( radians($1) ) * sin( radians( s.latitude ) ) 
        ) ) AS distance
      FROM bins b
      JOIN sites s ON b.site_id = s.site_id
      WHERE LOWER(b.active_inactive) = 'active'
        AND s.latitude IS NOT NULL 
        AND s.longitude IS NOT NULL
        AND ( 6371 * acos( 
          cos( radians($1) ) * cos( radians( s.latitude ) )
          * cos( radians( s.longitude ) - radians($2) ) 
          + sin( radians($1) ) * sin( radians( s.latitude ) ) 
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
          status: bin.status ? bin.status.toLowerCase() : 'active',
          distance: parseFloat(bin.distance).toFixed(2)
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

// ==========================================
// 4. UPDATE STATUS (Maintenance Mode)
// ==========================================
const updateBinStatus = async (req, res) => {
  // Use bin_id (string) instead of integer ID
  const { id } = req.params; 
  const { status } = req.body;

  // Map frontend status to DB values if necessary
  // Frontend: 'active', 'maintenance'
  // DB: 'ACTIVE', 'INACTIVE' ?
  // For now, let's assume we store what is sent, or uppercase it
  const dbStatus = status.toUpperCase(); 

  try {
    const result = await pool.query(
      'UPDATE bins SET active_inactive = $1 WHERE bin_id = $2 RETURNING *',
      [dbStatus, id]
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


module.exports = {
  getAllBins,
  getBinByCode,
  getBinsNearby,
  updateBinStatus,
};