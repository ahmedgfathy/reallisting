// Vercel serverless function entry point
require('dotenv').config();

// Import the handlers
const authHandler = require('./auth');
const messagesHandler = require('./messages');
const adminHandler = require('./admin');
const regionsHandler = require('./regions');
const statsHandler = require('./stats');
const profileHandler = require('./profile');
const importWhatsappHandler = require('./import-whatsapp');

// Log environment check
console.log('🔧 API initialized, env check:', {
  hasSupabaseUrl: !!process.env.SUPABASE_URL,
  hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  hasJwtSecret: !!process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV
});

module.exports = async (req, res) => {
  // Get allowed origin from environment or allow all
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['https://www.contaboo.com', 'http://localhost:3000'];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.contaboo.com'); // Fallback to allow all
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = req.url.replace('/api/', '');
  
  // Route to appropriate handler
  if (path.startsWith('auth')) {
    return authHandler(req, res);
  } else if (path.startsWith('import-whatsapp')) {
    return importWhatsappHandler(req, res);
  } else if (path.startsWith('messages')) {
    return messagesHandler(req, res);
  } else if (path.startsWith('admin')) {
    return adminHandler(req, res);
  } else if (path.startsWith('regions')) {
    return regionsHandler(req, res);
  } else if (path.startsWith('stats')) {
    return statsHandler(req, res);
  } else if (path.startsWith('profile')) {
    return profileHandler(req, res);
  } else if (path === '' || path === '/') {
    return res.status(200).json({ status: 'ok', message: 'API is running', timestamp: new Date().toISOString() });
  } else {
    return res.status(404).json({ error: 'Not found' });
  }
};
