const pool = require('./config/database');

// Dummy bin codes that were added by add-sample-bins.js
const dummyBinCodes = [
  'BIN001', 'BIN002', 'BIN003', 'BIN004', 'BIN005',
  'BIN006', 'BIN007', 'BIN008', 'BIN009', 'BIN010'
];

async function removeDummyBins() {
  try {
    console.log('🗑️  Removing dummy bins from database...\n');

    // Check total bins before deletion
    const beforeCount = await pool.query('SELECT COUNT(*) FROM bins');
    console.log(`📊 Total bins before cleanup: ${beforeCount.rows[0].count}`);

    let deletedCount = 0;
    let notFoundCount = 0;

    for (const binCode of dummyBinCodes) {
      const result = await pool.query(
        'DELETE FROM bins WHERE bin_code = $1 RETURNING *',
        [binCode]
      );

      if (result.rows.length > 0) {
        console.log(`✅ Deleted: ${binCode} - ${result.rows[0].location_name}`);
        deletedCount++;
      } else {
        console.log(`⏭️  Not found: ${binCode} (already removed or doesn't exist)`);
        notFoundCount++;
      }
    }

    // Check total bins after deletion
    const afterCount = await pool.query('SELECT COUNT(*) FROM bins');
    console.log(`\n📊 Total bins after cleanup: ${afterCount.rows[0].count}`);

    console.log('\n📊 Summary:');
    console.log(`   ✅ Deleted: ${deletedCount}`);
    console.log(`   ⏭️  Not found: ${notFoundCount}`);

    // Show remaining bins
    console.log('\n🗄️  Remaining bins in database:');
    const remainingBins = await pool.query(
      'SELECT bin_code, location_name FROM bins ORDER BY id LIMIT 10'
    );
    remainingBins.rows.forEach(bin => {
      console.log(`   - ${bin.bin_code}: ${bin.location_name}`);
    });
    console.log(`   ... and ${parseInt(afterCount.rows[0].count) - 10} more`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing dummy bins:', error.message);
    process.exit(1);
  }
}

removeDummyBins();