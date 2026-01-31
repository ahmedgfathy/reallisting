// Vercel serverless function entry point
require('dotenv').config();

// Configure body size limit for Vercel
module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb'
    },
    responseLimit: '8mb'
  }
};

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
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['https://www.contaboo.com', 'http://localhost:3000', 'http://localhost:5001', 'https://reallisting.vercel.app'];

  const origin = req.headers.origin;

  // Set CORS headers
  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // Fallback - allow all for development
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Normalize path: remove /api/ prefix and any leading/trailing slashes
  let path = req.url.split('?')[0].replace(/^\/api\//, '').replace(/^\/+|\/+$/g, '');

  console.log(`📡 API Request: ${req.method} ${req.url} -> Normalized path: ${path}`);

  // Route to appropriate handler
  if (path === 'auth' || path.startsWith('auth/')) {
    return authHandler(req, res);
  } else if (path === 'import-whatsapp' || path.startsWith('import-whatsapp/')) {
    return importWhatsappHandler(req, res);
  } else if (path === 'messages' || path.startsWith('messages/')) {
    return messagesHandler(req, res);
  } else if (path === 'admin' || path.startsWith('admin/')) {
    return adminHandler(req, res);
  } else if (path === 'regions' || path.startsWith('regions/')) {
    return regionsHandler(req, res);
  } else if (path === 'stats' || path.startsWith('stats/')) {
    return statsHandler(req, res);
  } else if (path === 'profile' || path.startsWith('profile/')) {
    return profileHandler(req, res);
  } else if (path === '' || path === '/') {
    return res.status(200).json({
      status: 'ok',
      message: 'API is running',
      timestamp: new Date().toISOString(),
      env: {
        nodeEnv: process.env.NODE_ENV,
        usingSupabase: !!process.env.SUPABASE_URL
      }
    });
  } else {
    console.warn(`⚠️ Route not found: ${path}`);
    return res.status(404).json({ error: `Route not found: ${path}` });
  }
};
