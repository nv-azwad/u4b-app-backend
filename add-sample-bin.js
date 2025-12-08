const pool = require('./config/database');

const addSampleBins = async () => {
  try {
    console.log('🔧 Adding sample bins...');

    const bins = [
      ['BIN001', 3.8077, 103.3260, 'Kuantan City Mall', 'active'],
      ['BIN002', 3.7833, 103.3667, 'IIUM Kuantan', 'active'],
      ['BIN003', 3.8167, 103.3333, 'East Coast Mall', 'active'],
      ['BIN004', 3.8333, 103.3500, 'Berjaya Megamall', 'active'],
      ['BIN005', 3.7833, 103.3500, 'Teluk Cempedak Beach', 'active']
    ];

    for (const bin of bins) {
      await pool.query(
        `INSERT INTO bins (bin_code, latitude, longitude, location_name, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (bin_code) DO NOTHING`,
        bin
      );
    }

    console.log('5 sample bins added!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error adding bins:', error);
    process.exit(1);
  }
};

addSampleBins();