  const pool = require('./config/database');

  // SQL queries to create all tables
  const createTables = async () => {
    try {
      console.log('🔧 Creating database tables...');

      // 1. Users table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(20),
          name VARCHAR(255),
          auth_provider VARCHAR(50) NOT NULL,
          auth_id VARCHAR(255) UNIQUE NOT NULL,
          points INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Users table created');

      // 2. Bins table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bins (
          id SERIAL PRIMARY KEY,
          bin_code VARCHAR(50) UNIQUE NOT NULL,
          latitude DECIMAL(10, 8) NOT NULL,
          longitude DECIMAL(11, 8) NOT NULL,
          location_name VARCHAR(255),
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Bins table created');

      // 3. Donations table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS donations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          bin_id INTEGER REFERENCES bins(id) ON DELETE CASCADE,
          media_url TEXT,
          media_latitude DECIMAL(10, 8),
          media_longitude DECIMAL(11, 8),
          media_timestamp TIMESTAMP,
          scan_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'pending',
          points_earned INTEGER DEFAULT 0,
          verification_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Donations table created');

      // 4. Rewards table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS rewards (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          points_required INTEGER NOT NULL,
          reward_type VARCHAR(50) NOT NULL,
          reward_value TEXT,
          stock INTEGER DEFAULT -1,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Rewards table created');

      // 5. User Rewards (Redemptions) table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_rewards (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          reward_id INTEGER REFERENCES rewards(id) ON DELETE CASCADE,
          points_spent INTEGER NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          redemption_code VARCHAR(50),
          redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ User Rewards table created');

      console.log('\n🎉 All tables created successfully!');
      process.exit(0);

    } catch (error) {
      console.error('❌ Error creating tables:', error);
      process.exit(1);
    }
  };

  // Run the function
  createTables();