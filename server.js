//Get secrets from .env
require('dotenv').config();

//Express = Node.js framework
const express = require('express');

//Cors = used to determine who can access the backend
const cors = require('cors');

//Initialise the app
const app = express();

//Set the backend's port to 5000
const PORT = process.env.PORT || 5000;

//Allow public access to the backend
app.use(cors({
  origin: true,
  credentials: true
}));

//Convert all JSON (data from web users) to JS
app.use(express.json()); 

// Import routes (create variables to store the objects exported by the ./routes/XX)
const authRoutes = require('./routes/auth');
const donationsRoutes = require('./routes/donations');
const binsRoutes = require('./routes/bins');
const vouchersRoutes = require('./routes/vouchers');
const adminRoutes = require('./routes/admin');

// Use routes (attach/mount routes to the base/api URLs so that they are accessible via HTTP)
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/bins', binsRoutes);
app.use('/api/vouchers', vouchersRoutes);
app.use('/api/admin', adminRoutes);

// If anyone just opens the backend without any specific request ('/'), it shows the message to verify that its running
app.get('/', (req, res) => {
  res.json({ 
    message: 'U4B Backend API is running!',
    status: 'success'
  });
});

// Start the server and start listening to requests
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});