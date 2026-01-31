// Database Wrapper - Supports both Supabase and MySQL
const supabase = require('./supabase');
const mysql = require('./mysql');
const crypto = require('crypto');

// Determine which database to use
const useSupabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (useSupabase) {
  console.log('🔌 Using Supabase database provider');
} else {
  console.log('🔌 Using MySQL database provider');
}

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'reallisting_secret_key_2025_secure';

// Helper Functions
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// Re-use tokens logic from supabase or mysql wrappers if they exist, or define here
const generateToken = supabase.generateToken;
const verifyToken = supabase.verifyToken;
const corsHeaders = supabase.corsHeaders;

// Users API wrapper
const users = {
  async create(data, password, name, role = 'broker') {
    if (useSupabase) {
      // Handle both object and separate arguments
      const userData = typeof data === 'object' ? data : { mobile: data, password, name, role };
      return await supabase.users.create(userData);
    } else {
      const userData = typeof data === 'object' ? data : { mobile: data, password, name, role };
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
    }
  },

  async getByMobile(mobile) {
    if (useSupabase) {
      return await supabase.users.findByMobile(mobile);
    } else {
      return await mysql.getUserByMobile(mobile);
    }
  },

  async getById(id) {
    if (useSupabase) {
      return await supabase.users.findById(id);
    } else {
      return await mysql.getUserById(id);
    }
  },

  async verifyPassword(mobile, password) {
    if (useSupabase) {
      return await supabase.users.verifyPassword(mobile, password);
    } else {
      const user = await mysql.getUserByMobile(mobile);
      if (!user) return null;

      const hashedPassword = hashPassword(password);
      if (user.password !== hashedPassword) return null;

      return user;
    }
  },

  async update(id, updates) {
    if (useSupabase) {
      const { data, error } = await supabase.supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      await mysql.updateUser(id, updates);
      return await mysql.getUserById(id);
    }
  },

  async getAll() {
    if (useSupabase) {
      return await supabase.users.getAll();
    } else {
      return await mysql.getAllUsers();
    }
  }
};

// Messages API wrapper
const messages = {
  async create(messageData) {
    if (useSupabase) {
      return await supabase.messages.create(messageData);
    } else {
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
    }
  },

  async getAll(filters = {}, limit = 100, offset = 0) {
    if (useSupabase) {
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
    } else {
      return await mysql.getMessages(filters, limit, offset);
    }
  },

  async getById(id) {
    if (useSupabase) {
      const { data, error } = await supabase.supabase
        .from('messages')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return null;
      return data;
    } else {
      return await mysql.getMessageById(id);
    }
  },

  async update(id, updates) {
    if (useSupabase) {
      const { data, error } = await supabase.supabase
        .from('messages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      await mysql.updateMessage(id, updates);
      return await mysql.getMessageById(id);
    }
  },

  async delete(id) {
    if (useSupabase) {
      return await supabase.messages.delete(id);
    } else {
      await mysql.deleteMessage(id);
      return { success: true };
    }
  },

  async count(filters = {}) {
    if (useSupabase) {
      const result = await supabase.messages.get({
        limit: 1,
        search: filters.search,
        category: filters.category,
        propertyType: filters.property_type || filters.propertyType,
        region: filters.region,
        purpose: filters.purpose
      });
      return result.total || 0;
    } else {
      return await mysql.getMessageCount(filters);
    }
  }
};

// Regions API wrapper
const regions = {
  async create(regionData) {
    if (useSupabase) {
      const name = typeof regionData === 'string' ? regionData : regionData.name;
      return await supabase.regions.create(name);
    } else {
      const id = generateId();
      await mysql.createRegion({
        id,
        name: regionData.name
      });
      return { id, ...regionData };
    }
  },

  async getAll() {
    if (useSupabase) {
      return await supabase.regions.getAll();
    } else {
      return await mysql.getAllRegions();
    }
  },

  async getById(id) {
    if (useSupabase) {
      const { data, error } = await supabase.supabase
        .from('regions')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return null;
      return data;
    } else {
      return await mysql.getRegionById(id);
    }
  },

  async update(id, updates) {
    if (useSupabase) {
      const { data, error } = await supabase.supabase
        .from('regions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      await mysql.updateRegion(id, updates);
      return await mysql.getRegionById(id);
    }
  },

  async delete(id) {
    if (useSupabase) {
      const { error } = await supabase.supabase
        .from('regions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } else {
      await mysql.deleteRegion(id);
      return { success: true };
    }
  }
};

// Stats
async function getStats() {
  if (useSupabase) {
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
  } else {
    return await mysql.getStats();
  }
}

// Initialize database
async function initDatabase() {
  if (useSupabase) {
    return await supabase.initDatabase();
  } else {
    return await mysql.initDatabase();
  }
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

