const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'reallisting_secret_key_2025_secure';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
  const data = JSON.stringify(payload);
  const hash = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
  return `${Buffer.from(data).toString('base64')}.${hash}`;
}

function verifyToken(token) {
  try {
    if (!token) return null;
    const [dataB64, hash] = token.split('.');
    if (!dataB64 || !hash) return null;
    
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

// Initialize Database Tables
async function initDatabase() {
  console.log('🔧 Initializing Supabase tables...');
  
  try {
    // Create users table
    const { error: usersError } = await supabase.rpc('create_users_table', {});
    if (usersError && !usersError.message.includes('already exists')) {
      console.log('Creating users table manually...');
    }

    // Create messages table
    const { error: messagesError } = await supabase.rpc('create_messages_table', {});
    if (messagesError && !messagesError.message.includes('already exists')) {
      console.log('Creating messages table manually...');
    }

    // Create regions table
    const { error: regionsError } = await supabase.rpc('create_regions_table', {});
    if (regionsError && !regionsError.message.includes('already exists')) {
      console.log('Creating regions table manually...');
    }

    console.log('✅ Supabase database initialized');
  } catch (error) {
    console.error('Error initializing database:', error.message);
  }
}

// Users Module
const users = {
  async create(data) {
    const mobile = typeof data === 'string' ? data : data.mobile;
    const password = typeof data === 'string' ? arguments[1] : data.password;
    const name = typeof data === 'string' ? arguments[2] : data.name || '';
    const role = typeof data === 'object' ? (data.role || 'broker') : 'broker';
    const isActive = typeof data === 'object' ? (data.isActive || false) : false;
    
    const id = generateId();
    const hashedPassword = hashPassword(password);
    
    const { data: result, error } = await supabase
      .from('users')
      .insert({
        id,
        mobile,
        password: hashedPassword,
        name,
        role,
        is_active: isActive
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        return { success: false, error: 'User already exists' };
      }
      return { success: false, error: error.message };
    }
    
    return { success: true, userId: id };
  },

  async findByMobile(mobile) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', mobile)
      .single();
    
    return error ? null : data;
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    return error ? null : data;
  },

  async verifyPassword(mobile, password) {
    const user = await this.findByMobile(mobile);
    if (!user) return null;
    
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) return null;
    
    return user;
  },

  async updateActive(userId, isActive) {
    const { error } = await supabase
      .from('users')
      .update({ is_active: isActive })
      .eq('id', userId);
    
    if (error) throw error;
  },

  async updateSubscription(userId, endDate) {
    const { error } = await supabase
      .from('users')
      .update({ subscription_end_date: endDate })
      .eq('id', userId);
    
    if (error) throw error;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('id, mobile, name, role, is_active, subscription_end_date, created_at')
      .order('created_at', { ascending: false });
    
    return error ? [] : data;
  }
};

// Messages Module
const messages = {
  async create(data) {
    const id = generateId();
    
    const { data: result, error } = await supabase
      .from('messages')
      .insert({
        id,
        message: data.message || '',
        sender_name: data.sender_name || '',
        sender_mobile: data.sender_mobile || '',
        date_of_creation: data.date_of_creation || new Date().toISOString(),
        source_file: data.source_file || '',
        image_url: data.image_url || '',
        category: data.category || 'أخرى',
        property_type: data.property_type || 'أخرى',
        region: data.region || 'أخرى',
        purpose: data.purpose || 'أخرى'
      })
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, id };
  },

  async get(options = {}) {
    const {
      page = 1,
      limit = 50,
      search = '',
      category = '',
      propertyType = '',
      region = '',
      purpose = ''
    } = options;

    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`message.ilike.%${search}%,sender_name.ilike.%${search}%,sender_mobile.ilike.%${search}%`);
    }
    if (category && category !== 'الكل') {
      query = query.eq('category', category);
    }
    if (propertyType && propertyType !== 'الكل') {
      query = query.eq('property_type', propertyType);
    }
    if (region && region !== 'الكل') {
      query = query.eq('region', region);
    }
    if (purpose && purpose !== 'الكل') {
      query = query.eq('purpose', purpose);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order('date_of_creation', { ascending: false })
      .range(from, to);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    };
  },

  async delete(id) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },

  async deleteMultiple(ids) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .in('id', ids);
    
    if (error) throw error;
    return { success: true, deletedCount: ids.length };
  },

  async getStats() {
    const { count: totalMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    const { data: files } = await supabase
      .from('messages')
      .select('source_file')
      .neq('source_file', '');

    const uniqueFiles = [...new Set(files?.map(f => f.source_file) || [])];

    return {
      totalMessages: totalMessages || 0,
      totalFiles: uniqueFiles.length,
      files: uniqueFiles
    };
  }
};

// Regions Module
const regions = {
  async getAll() {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .order('name');
    
    return error ? [] : data;
  },

  async create(name) {
    const id = generateId();
    
    const { data, error } = await supabase
      .from('regions')
      .insert({ id, name })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        return { success: false, error: 'Region already exists' };
      }
      return { success: false, error: error.message };
    }
    
    return { success: true, id };
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};

module.exports = {
  supabase,
  users,
  messages,
  regions,
  generateToken,
  verifyToken,
  corsHeaders,
  initDatabase
};
