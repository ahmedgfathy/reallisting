const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'reallisting_secret_key_2025_secure';

let supabase = null;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('⚠️ Missing Supabase credentials. Supabase features will be disabled.');
} else {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase client initialized');
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err.message);
  }
}

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
    if (messagesError) {
      // Fallback if RPC fails, at least ensure the column exists
      await supabase.rpc('add_metadata_column_to_messages', {});
    }

    // Ensure ai_metadata column exists
    await supabase.rpc('execute_sql', {
      sql: 'ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT \'{}\';'
    });

    // Add index for performance on filtering
    await supabase.rpc('execute_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING gin (ai_metadata);'
    });

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
  },

  async updateProfile(mobile, { name, password }) {
    const updates = {};
    if (name) updates.name = name;
    if (password) {
      updates.password = hashPassword(password);
    }

    if (Object.keys(updates).length === 0) return { success: true };

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('mobile', mobile);

    if (error) throw error;
    return { success: true };
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
        purpose: data.purpose || 'أخرى',
        ai_metadata: data.ai_metadata || {}
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id };
  },

  async createBatch(messagesData) {
    const records = messagesData.map(data => ({
      id: generateId(),
      message: data.message || '',
      sender_name: data.sender_name || '',
      sender_mobile: data.sender_mobile || '',
      date_of_creation: data.date_of_creation || new Date().toISOString(),
      source_file: data.source_file || '',
      image_url: data.image_url || '',
      category: data.category || 'أخرى',
      property_type: data.property_type || 'أخرى',
      region: data.region || 'أخرى',
      purpose: data.purpose || 'أخرى',
      ai_metadata: data.ai_metadata || {}
    }));

    const { data, error } = await supabase
      .from('messages')
      .insert(records)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: records.length };
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
  },

  async getFilterValues() {
    try {
      // Try to use a SQL function for efficiency (much faster on large datasets)
      const { data, error } = await supabase.rpc('get_unique_filter_values');
      if (!error && data) {
        return {
          categories: (data.categories || []).filter(Boolean),
          propertyTypes: (data.propertyTypes || []).filter(Boolean),
          purposes: (data.purposes || []).filter(Boolean),
          regions: (data.regions || []).filter(Boolean)
        };
      }
    } catch (e) {
      console.warn('RPC get_unique_filter_values not found, using fallback.');
    }

    // Fallback: Fetch unique values from recent messages only to prevent hanging
    // We only take the last 2000 messages to populate filters if RPC fails
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('category, property_type, purpose, region')
      .order('date_of_creation', { ascending: false })
      .limit(2000);

    return {
      categories: [...new Set(recentMessages?.map(c => c.category) || [])].filter(Boolean),
      propertyTypes: [...new Set(recentMessages?.map(p => p.property_type) || [])].filter(Boolean),
      purposes: [...new Set(recentMessages?.map(p => p.purpose) || [])].filter(Boolean),
      regions: [...new Set(recentMessages?.map(r => r.region) || [])].filter(Boolean)
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
