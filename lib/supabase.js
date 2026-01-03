const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
const missingVars = [];
if (!supabaseUrl) missingVars.push('SUPABASE_URL');
if (!supabaseKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

if (missingVars.length > 0) {
  console.error('❌ Missing Supabase environment variables:', missingVars.join(', '));
  console.error('Please add them in Vercel: Settings → Environment Variables → Add');
  console.error('Get from Supabase: Settings → API → service_role key');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'reallisting_secret_key_2025_secure';

// Generate simple token
function generateToken(username, role = 'broker') {
  const payload = {
    username,
    role,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  const data = JSON.stringify(payload);
  const hash = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
  return Buffer.from(data).toString('base64') + '.' + hash;
}

// Verify token
function verifyToken(token) {
  try {
    const [dataB64, hash] = token.split('.');
    const data = Buffer.from(dataB64, 'base64').toString();
    const expectedHash = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
    if (hash !== expectedHash) return null;
    const payload = JSON.parse(data);
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Hash password helper
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Helper to check if Supabase is configured
function isConfigured() {
  return supabase !== null;
}

// Helper to return configuration error response
function getConfigError() {
  const missingVars = [];
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missingVars.push('SUPABASE_URL');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return {
    error: 'Server configuration error',
    message: `Missing environment variable: ${missingVars.join(', ')}`,
    details: 'Add in Vercel → Settings → Environment Variables. Get service_role key from Supabase → Settings → API'
  };
}

module.exports = {
  supabase,
  generateToken,
  verifyToken,
  hashPassword,
  corsHeaders,
  JWT_SECRET,
  isConfigured,
  getConfigError
};
