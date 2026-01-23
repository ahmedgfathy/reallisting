// MySQL Database Wrapper - Compatible with Supabase-style API
const mysql = require('./mysql');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'reallisting_secret_key_2025_secure';

// Helper Functions
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

function generateToken(mobile, role = 'broker', isActive = false) {
  const payload = {
    mobile,
    role,
    isActive,
    exp: Date.now() + (24 * 60 * 60 * 1000)
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Users API wrapper
const users = {
  async create(userData) {
    const id = generateId();
    const hashedPassword = hashPassword(userData.password);
    await mysql.createUser({
      id,
      mobile: userData.mobile,
      password: hashedPassword,
      name: userData.name,
      role: userData.role || 'broker'
    });
    return { id, ...userData, password: hashedPassword };
  },

  async getByMobile(mobile) {
    return await mysql.getUserByMobile(mobile);
  },

  async getById(id) {
    return await mysql.getUserById(id);
  },

  async verifyPassword(mobile, password) {
    const user = await mysql.getUserByMobile(mobile);
    if (!user) return null;
    
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) return null;
    
    return user;
  },

  async update(id, updates) {
    await mysql.updateUser(id, updates);
    return await mysql.getUserById(id);
  },

  async getAll() {
    return await mysql.getAllUsers();
  }
};

// Messages API wrapper
const messages = {
  async create(messageData) {
    const id = generateId();
    try {
      await mysql.createMessage({
        id,
        ...messageData
      });
      return { success: true, id, ...messageData };
    } catch (error) {
      console.error('Message create error:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getAll(filters = {}, limit = 100, offset = 0) {
    return await mysql.getMessages(filters, limit, offset);
  },

  async getById(id) {
    return await mysql.getMessageById(id);
  },

  async update(id, updates) {
    await mysql.updateMessage(id, updates);
    return await mysql.getMessageById(id);
  },

  async delete(id) {
    await mysql.deleteMessage(id);
    return { success: true };
  },

  async count(filters = {}) {
    return await mysql.getMessageCount(filters);
  }
};

// Regions API wrapper
const regions = {
  async create(regionData) {
    const id = generateId();
    await mysql.createRegion({
      id,
      name: regionData.name
    });
    return { id, ...regionData };
  },

  async getAll() {
    return await mysql.getAllRegions();
  },

  async getById(id) {
    return await mysql.getRegionById(id);
  },

  async update(id, updates) {
    await mysql.updateRegion(id, updates);
    return await mysql.getRegionById(id);
  },

  async delete(id) {
    await mysql.deleteRegion(id);
    return { success: true };
  }
};

// Stats
async function getStats() {
  return await mysql.getStats();
}

// Initialize database
async function initDatabase() {
  return await mysql.initDatabase();
}

module.exports = {
  users,
  messages,
  regions,
  generateId,
  generateToken,
  verifyToken,
  hashPassword,
  corsHeaders,
  getStats,
  initDatabase
};
