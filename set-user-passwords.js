const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function setPasswords() {
  try {
    console.log('🔐 Setting passwords for existing accounts...');

    // Hash passwords
    const testPassword = await bcrypt.hash('test', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    // Update test@gmail.com
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, last_password_change = NOW()
       WHERE email = $2`,
      [testPassword, 'test@gmail.com']
    );
    console.log('✅ Password set for test@gmail.com');

    // Update admin@u4b.com
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, last_password_change = NOW()
       WHERE email = $2`,
      [adminPassword, 'admin@u4b.com']
    );
    console.log('✅ Password set for admin@u4b.com');

    console.log('\n🎉 All passwords set successfully!');
    console.log('📝 Passwords:');
    console.log('   test@gmail.com → test');
    console.log('   admin@u4b.com → admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting passwords:', error);
    process.exit(1);
  }
}

setPasswords();