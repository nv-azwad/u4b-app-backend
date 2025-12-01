const pool = require('./config/database');

const removePointsSystem = async () => {
  try {
    console.log('🔧 Removing points system from database...');

    // 1. Drop points column from users table
    await pool.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS points;
    `);
    console.log('✅ Removed points column from users table');

    // 2. Drop points_earned column from donations table
    await pool.query(`
      ALTER TABLE donations 
      DROP COLUMN IF EXISTS points_earned;
    `);
    console.log('✅ Removed points_earned column from donations table');

    // 3. Add admin review fields to donations table
    await pool.query(`
      ALTER TABLE donations 
      ADD COLUMN IF NOT EXISTS admin_reviewed BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS admin_notes TEXT,
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
    `);
    console.log('✅ Added admin review fields to donations table');

    // 4. Add is_admin field to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
    `);
    console.log('✅ Added is_admin field to users table');

    // 5. Update claimed_vouchers table
    await pool.query(`
      ALTER TABLE claimed_vouchers 
      DROP COLUMN IF EXISTS donation_id;
    `);
    console.log('✅ Removed donation_id from claimed_vouchers table');

    // 6. Drop rewards and user_rewards tables (not needed anymore)
    await pool.query(`
      DROP TABLE IF EXISTS user_rewards;
      DROP TABLE IF EXISTS rewards;
    `);
    console.log('✅ Dropped rewards and user_rewards tables');

    console.log('\n🎉 Points system removed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Set an admin account: UPDATE users SET is_admin = true WHERE email = \'your@email.com\';');
    console.log('2. Test donation flow');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Error removing points system:', error);
    process.exit(1);
  }
};

removePointsSystem();