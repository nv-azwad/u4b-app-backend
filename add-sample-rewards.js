const pool = require('./config/database');

const addSampleRewards = async () => {
  try {
    console.log('🔧 Adding sample rewards...');

    const rewards = [
      {
        title: 'Starbucks RM10 Voucher',
        description: 'Get RM10 off your next Starbucks purchase',
        points_required: 100,
        reward_type: 'voucher',
        reward_value: 'STAR10OFF',
        stock: 50
      },
      {
        title: 'McDonald\'s RM5 Voucher',
        description: 'Enjoy RM5 off at McDonald\'s',
        points_required: 50,
        reward_type: 'voucher',
        reward_value: 'MCD5OFF',
        stock: 100
      },
      {
        title: '10% Discount at Local Stores',
        description: 'Get 10% discount at participating local stores',
        points_required: 30,
        reward_type: 'discount',
        reward_value: '10PERCENT',
        stock: -1 // Unlimited
      },
      {
        title: 'Movie Ticket Discount',
        description: 'RM8 off movie tickets at TGV/GSC',
        points_required: 80,
        reward_type: 'voucher',
        reward_value: 'MOVIE8',
        stock: 30
      },
      {
        title: 'Free Coffee',
        description: 'One free coffee at participating cafes',
        points_required: 25,
        reward_type: 'voucher',
        reward_value: 'FREECOFFEE',
        stock: 200
      }
    ];

    for (const reward of rewards) {
      await pool.query(
        `INSERT INTO rewards (title, description, points_required, reward_type, reward_value, stock, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT DO NOTHING`,
        [reward.title, reward.description, reward.points_required, reward.reward_type, reward.reward_value, reward.stock]
      );
    }

    console.log('✅ Sample rewards added successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error adding sample rewards:', error);
    process.exit(1);
  }
};

addSampleRewards();  