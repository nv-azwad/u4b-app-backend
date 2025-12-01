const pool = require('./config/database');

const createAdminAccount = async () => {
  try {
    console.log('🔧 Creating test admin account...');

    const existingAdmin = await pool.query(
      "SELECT * FROM users WHERE email = 'admin@u4b.com'"
    );

    if (existingAdmin.rows.length > 0) {
      console.log('⚠️ Admin account already exists!');
      
      await pool.query(
        "UPDATE users SET is_admin = true WHERE email = 'admin@u4b.com'"
      );
      
      console.log('✅ Admin privileges confirmed for admin@u4b.com');
    } else {
      await pool.query(
        `INSERT INTO users (email, name, phone, auth_provider, auth_id, is_admin, email_verified, total_donations_count)
         VALUES ('admin@u4b.com', 'Admin User', '+60123456789', 'email', 'admin123', true, true, 0)`
      );
      
      console.log('✅ Admin account created!');
    }

    console.log('\n📝 Admin Login Credentials:');
    console.log('   Email: admin@u4b.com');
    console.log('\n🎉 You can now access the admin panel!');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    process.exit(1);
  }
};

createAdminAccount();