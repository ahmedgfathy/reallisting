const { Client } = require('pg');
const crypto = require('crypto');

// Database connection - Prisma/Contabo PostgreSQL
// Use direct connection URL (not Accelerate URL for Node.js pg client)
const DATABASE_URL = process.env.POSTGRES_URL || 'postgres://823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1:sk_iv0LK6rujPpicqk6uuUaE@db.prisma.io:5432/postgres?sslmode=require';

if (!DATABASE_URL) {
  console.error('❌ Missing database configuration!');
  console.error('Required: PRISMA_DATABASE_URL or POSTGRES_URL');
  console.error('Please configure in Vercel: Settings → Environment Variables');
}

// Create connection pool
let db = null;

function getDB() {
  if (!db && DATABASE_URL) {
    db = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    db.connect().catch(err => {
      console.error('❌ Database connection failed:', err.message);
      db = null;
    });
  }
  return db;
}

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

// Helper to check if database is configured
function isConfigured() {
  return DATABASE_URL !== null && DATABASE_URL !== undefined;
}

// Helper to return configuration error response
function getConfigError() {
  const missingVars = [];
  if (!process.env.PRISMA_DATABASE_URL && !process.env.POSTGRES_URL) {
    missingVars.push('PRISMA_DATABASE_URL or POSTGRES_URL');
  }
  
  return {
    error: 'Server configuration error',
    message: `Missing environment variable: ${missingVars.join(', ')}`,
    details: 'Add in Vercel → Settings → Environment Variables'
  };
}

// Database query helper with error handling
async function query(sql, params = []) {
  const client = getDB();
  if (!client) {
    throw new Error('Database not configured');
  }
  
  try {
    const result = await client.query(sql, params);
    return { data: result.rows, error: null, count: result.rowCount };
  } catch (error) {
    console.error('Database query error:', error);
    return { data: null, error: error.message, count: 0 };
  }
}

module.exports = {
  db: getDB,
  query,
  generateToken,
  verifyToken,
  hashPassword,
  corsHeaders,
  JWT_SECRET,
  isConfigured,
  getConfigError
};
