const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./api/auth'));
app.use('/api/messages', require('./api/messages'));
app.use('/api/admin', require('./api/admin'));
app.use('/api/regions', require('./api/regions'));
app.use('/api/stats', require('./api/stats'));
app.use('/api/profile', require('./api/profile'));

// Health/root check for direct hits to port 5001
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API server running', apiBase: '/api' });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
  console.log(`🗄️  Using Supabase PostgreSQL database`);
  console.log(`🌐 Supabase URL: ${process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}`);
});
