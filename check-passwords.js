const pool = require('./config/database');

async function checkPasswords() {
  try {
    console.log('🔍 Checking user passwords...\n');

    const result = await pool.query(
      `SELECT email, 
              CASE WHEN password_hash IS NULL THEN 'NO PASSWORD' 
                   ELSE 'PASSWORD SET' 
              END as password_status,
              is_admin
       FROM users 
       ORDER BY email`
    );

    console.log('📋 User Status:');
    console.log('─────────────────────────────────────────');
    result.rows.forEach(user => {
      const adminBadge = user.is_admin ? '👑 ADMIN' : '👤 USER';
      console.log(`${user.email.padEnd(25)} | ${user.password_status.padEnd(15)} | ${adminBadge}`);
    });
    console.log('─────────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPasswords();