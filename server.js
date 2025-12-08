require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json()); // Parse JSON bodies

// ADD THIS - Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Import routes
const authRoutes = require('./routes/auth');
const donationsRoutes = require('./routes/donations');
const rewardsRoutes = require('./routes/rewards');
const binsRoutes = require('./routes/bins');
const vouchersRoutes = require('./routes/vouchers');
const adminRoutes = require('./routes/admin');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/bins', binsRoutes);
app.use('/api/vouchers', vouchersRoutes);
app.use('/api/admin', adminRoutes);


// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'U4B Backend API is running!',
    status: 'success',
    version: '1.0.0'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});