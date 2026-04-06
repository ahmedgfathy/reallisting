const authHandler = require('./auth');
const messagesHandler = require('./messages');
const adminHandler = require('./admin');
const regionsHandler = require('./regions');
const statsHandler = require('./stats');
const profileHandler = require('./profile');
const importWhatsappHandler = require('./import-whatsapp');

module.exports = async (req, res) => {
  // CORS configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['https://www.contaboo.com', 'http://localhost:3000', 'http://localhost:5001', 'https://reallisting.vercel.app'];

  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get the path relative to /api
  // In Vercel, req.url might be "/api/auth/login" or just "/auth/login"
  let fullPath = req.url.split('?')[0];
  let path = fullPath.replace(/^\/api(?:\/|$)/, '').replace(/^\/+|\/+$/g, '');

  console.log(`📡 [API] ${req.method} ${fullPath} -> Clean path: ${path}`);

  // Route mapping
  if (path === 'auth' || path.startsWith('auth/')) {
    return authHandler(req, res);
  } else if (path === 'import-whatsapp' || path.startsWith('import-whatsapp/')) {
    return importWhatsappHandler(req, res);
  } else if (path === 'messages' || path.startsWith('messages/')) {
    if (path === 'messages/delete') {
      req.query.path = 'messages';
      return adminHandler(req, res);
    }
    return messagesHandler(req, res);
  } else if (path === 'admin' || path.startsWith('admin/')) {
    return adminHandler(req, res);
  } else if (path === 'regions' || path.startsWith('regions/')) {
    return regionsHandler(req, res);
  } else if (path === 'stats' || path.startsWith('stats/')) {
    return statsHandler(req, res);
  } else if (path === 'refresh') {
    return res.status(200).json({
      success: true,
      message: 'Refresh acknowledged'
    });
  } else if (path === 'profile' || path.startsWith('profile/')) {
    return profileHandler(req, res);
  } else if (path === '' || path === 'index') {
    const usingSupabase = !!(process.env.SUPABASE_URL && (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ));
    return res.status(200).json({
      status: 'ok',
      message: 'RealListing API is running',
      database: usingSupabase ? 'Supabase' : 'Local JSON DB',
      timestamp: new Date().toISOString()
    });
  } else {
    console.error(`❌ [API] Route not found: ${path}`);
    return res.status(404).json({
      error: 'Not Found',
      path: path,
      suggestion: 'Check your API routing configuration'
    });
  }
};
