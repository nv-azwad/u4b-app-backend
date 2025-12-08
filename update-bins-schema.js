const pool = require('./config/database');

async function updateBinsSchema() {
  try {
    console.log('🔄 Updating bins table schema...');

    // Add new columns to bins table
    await pool.query(`
      ALTER TABLE bins 
      ADD COLUMN IF NOT EXISTS qr_code_id VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS site_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS location_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS bin_count INTEGER DEFAULT 1;
    `);

    console.log('✅ Bins table schema updated successfully!');
    console.log('New columns added:');
    console.log('  - qr_code_id (unique identifier from QR code)');
    console.log('  - site_code (site identifier)');
    console.log('  - address (full address)');
    console.log('  - location_code (internal reference)');
    console.log('  - bin_count (number of bins at location)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating schema:', error.message);
    process.exit(1);
  }
}

updateBinsSchema();