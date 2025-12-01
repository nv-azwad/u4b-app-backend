const pool = require('./config/database');

const fixVouchersSchema = async () => {
  try {
    console.log('🔧 Fixing vouchers schema...');

    // 1. Create vouchers table FIRST (if not exists)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id SERIAL PRIMARY KEY,
        partner_name VARCHAR(100) NOT NULL,
        description TEXT,
        discount_amount VARCHAR(50),
        terms_conditions TEXT,
        expiry_date DATE,
        is_active BOOLEAN DEFAULT true,
        stock_count INTEGER DEFAULT -1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Vouchers table created');

    // 2. Drop and recreate claimed_vouchers
    await pool.query('DROP TABLE IF EXISTS claimed_vouchers CASCADE');
    
    await pool.query(`
      CREATE TABLE claimed_vouchers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        voucher_id INTEGER REFERENCES vouchers(id) ON DELETE CASCADE,
        voucher_code VARCHAR(100) UNIQUE NOT NULL,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Claimed vouchers table fixed');

    // 3. Clear and add fresh vouchers
    await pool.query('DELETE FROM vouchers');
    await pool.query(`
      INSERT INTO vouchers (partner_name, description, discount_amount, terms_conditions, expiry_date) 
      VALUES 
        ('U4B', 'Get RM20 off on your next purchase', 'RM20 OFF', 'Valid for 30 days. Min purchase RM50.', '2025-12-31'),
        ('Best Bundle', 'Free delivery on all orders', 'FREE DELIVERY', 'No minimum purchase. Valid 30 days.', '2025-12-31'),
        ('Zalora', '15% discount on fashion items', '15% OFF', 'Valid on regular items only. Max RM50.', '2025-12-31');
    `);
    console.log('✅ 3 sample vouchers added');

    console.log('\n🎉 Schema fixed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixVouchersSchema();