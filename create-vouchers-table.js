const pool = require('./config/database');

const createVouchersTable = async () => {
  try {
    console.log('🔧 Creating vouchers table...');

    // Table to store claimed vouchers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS claimed_vouchers (
        id SERIAL PRIMARY KEY,
        donation_id INTEGER REFERENCES donations(id) ON DELETE CASCADE UNIQUE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        voucher_type VARCHAR(50) NOT NULL,
        voucher_code VARCHAR(50) NOT NULL,
        voucher_value INTEGER NOT NULL,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active'
      );
    `);
    console.log('✅ Claimed vouchers table created');

    // Add voucher_claimed flag to donations table
    await pool.query(`
      ALTER TABLE donations 
      ADD COLUMN IF NOT EXISTS voucher_claimed BOOLEAN DEFAULT false;
    `);
    console.log('✅ Added voucher_claimed to donations table');

    console.log('\n🎉 Vouchers table setup completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating vouchers table:', error);
    process.exit(1);
  }
};

createVouchersTable();