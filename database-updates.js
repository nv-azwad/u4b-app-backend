const pool = require('./config/database');

const updateDatabase = async () => {
  try {
    console.log('🔧 Updating database schema...');

    // 1. Add email_verified to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS total_donations_count INTEGER DEFAULT 0;
    `);
    console.log('✅ Updated users table');

    // 2. Add month/year tracking to user_rewards table
    await pool.query(`
      ALTER TABLE user_rewards 
      ADD COLUMN IF NOT EXISTS redeemed_month INTEGER,
      ADD COLUMN IF NOT EXISTS redeemed_year INTEGER;
    `);
    console.log('✅ Updated user_rewards table');

    // 3. Update existing user_rewards records with month/year
    await pool.query(`
      UPDATE user_rewards 
      SET redeemed_month = EXTRACT(MONTH FROM redeemed_at),
          redeemed_year = EXTRACT(YEAR FROM redeemed_at)
      WHERE redeemed_month IS NULL;
    `);
    console.log('✅ Updated existing redemption records');

    // 4. Update total_donations_count for existing users
    await pool.query(`
      UPDATE users u
      SET total_donations_count = (
        SELECT COUNT(*) 
        FROM donations d 
        WHERE d.user_id = u.id AND d.status = 'confirmed'
      );
    `);
    console.log('✅ Updated donation counts for existing users');

    console.log('\n🎉 Database update completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error updating database:', error);
    process.exit(1);
  }
};

updateDatabase();