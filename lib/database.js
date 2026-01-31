// Database Wrapper - Exclusively Supabase
const supabase = require('./supabase');
const crypto = require('crypto');

// Ensure Supabase is configured
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('⚠️ WARNING: Supabase credentials not found. Database operations will fail.');
}

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'reallisting_secret_key_2025_secure';

// Helper Functions
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// Re-use tokens logic from supabase wrapper
const generateToken = supabase.generateToken;
const verifyToken = supabase.verifyToken;
const corsHeaders = supabase.corsHeaders;

// Users API wrapper
const users = {
  async create(data, password, name, role = 'broker') {
    // Handle both object and separate arguments
    const userData = typeof data === 'object' ? data : { mobile: data, password, name, role };
    return await supabase.users.create(userData);
  },

  async getByMobile(mobile) {
    return await supabase.users.findByMobile(mobile);
  },

  async getById(id) {
    return await supabase.users.findById(id);
  },

  async verifyPassword(mobile, password) {
    return await supabase.users.verifyPassword(mobile, password);
  },

  async update(id, updates) {
    const { data, error } = await supabase.supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAll() {
    return await supabase.users.getAll();
  }
};

// Messages API wrapper
const messages = {
  async create(messageData) {
    return await supabase.messages.create(messageData);
  },

  async getAll(filters = {}, limit = 100, offset = 0) {
    const page = Math.floor(offset / limit) + 1;
    const result = await supabase.messages.get({
      page,
      limit,
      search: filters.search,
      category: filters.category,
      propertyType: filters.property_type || filters.propertyType,
      region: filters.region,
      purpose: filters.purpose
    });
    return result.data || [];
  },

  async getById(id) {
    const { data, error } = await supabase.supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase.supabase
      .from('messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    return await supabase.messages.delete(id);
  },

  async count(filters = {}) {
    const result = await supabase.messages.get({
      limit: 1,
      search: filters.search,
      category: filters.category,
      propertyType: filters.property_type || filters.propertyType,
      region: filters.region,
      purpose: filters.purpose
    });
    return result.total || 0;
  }
};

// Regions API wrapper
const regions = {
  async create(regionData) {
    const name = typeof regionData === 'string' ? regionData : regionData.name;
    return await supabase.regions.create(name);
  },

  async getAll() {
    return await supabase.regions.getAll();
  },

  async getById(id) {
    const { data, error } = await supabase.supabase
      .from('regions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase.supabase
      .from('regions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase.supabase
      .from('regions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  }
};

// Stats
async function getStats() {
  const messageStats = await supabase.messages.getStats();
  const usersList = await supabase.users.getAll();
  const regionsList = await supabase.regions.getAll();

  return {
    users: {
      total: usersList.length,
      active: usersList.filter(u => u.is_active || u.isActive).length
    },
    messages: {
      total: messageStats.totalMessages
    },
    regions: {
      total: regionsList.length
    },
    totalMessages: messageStats.totalMessages,
    totalFiles: messageStats.totalFiles,
    totalSubscribers: usersList.filter(u => u.is_active || u.isActive).length
  };
}

// Initialize database
async function initDatabase() {
  return await supabase.initDatabase();
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
