const pool = require('./config/database');

async function addPasswordColumn() {
  try {
    console.log('🔧 Adding password column to users table...');

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
      ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP
    `);

    console.log('✅ Password column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding password column:', error);
    process.exit(1);
  }
}

addPasswordColumn();