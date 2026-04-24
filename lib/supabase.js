const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
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

function isMissingAiMetadataColumn(error) {
  const message = String(error?.message || '');
  const code = String(error?.code || '');
  return code === 'PGRST204' && message.includes('ai_metadata');
}

function toMessageInsertRecord(data, { includeAiMetadata = true } = {}) {
  const record = {
    id: generateId(),
    message: data.message || '',
    sender_name: String(data.sender_name || '').slice(0, 255),
    sender_mobile: String(data.sender_mobile || '').slice(0, 20),
    date_of_creation: data.date_of_creation || new Date().toISOString(),
    source_file: String(data.source_file || '').slice(0, 255),
    image_url: data.image_url || '',
    category: String(data.category || 'أخرى').slice(0, 100),
    property_type: String(data.property_type || 'أخرى').slice(0, 100),
    region: String(data.region || 'أخرى').slice(0, 100),
    purpose: String(data.purpose || 'أخرى').slice(0, 100)
  };

  if (includeAiMetadata) {
    record.ai_metadata = data.ai_metadata || {};
  }

  return record;
}

// Initialize Database Tables
async function initDatabase() {
  // Simplified: just verify connection without running DDL RPCs
  console.log('🔧 Verifying Supabase connection...');

  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
    } else {
      console.log('✅ Supabase database ready');
    }
  } catch (error) {
    console.error('Error verifying database:', error.message);
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
    const primaryRecord = toMessageInsertRecord(data, { includeAiMetadata: true });
    let { error } = await supabase
      .from('messages')
      .insert(primaryRecord);

    if (error && isMissingAiMetadataColumn(error)) {
      const fallbackRecord = toMessageInsertRecord(data, { includeAiMetadata: false });
      fallbackRecord.id = primaryRecord.id;
      ({ error } = await supabase.from('messages').insert(fallbackRecord));
    }

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: primaryRecord.id };
  },

  async createBatch(messagesData) {
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized — check SUPABASE_URL and one of SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, or SUPABASE_PUBLISHABLE_KEY' };
    }

    const CHUNK_SIZE = 100;
    let totalInserted = 0;

    for (let i = 0; i < messagesData.length; i += CHUNK_SIZE) {
      const chunk = messagesData.slice(i, i + CHUNK_SIZE);
      const records = chunk.map((data) => toMessageInsertRecord(data, { includeAiMetadata: true }));

      let { error } = await supabase
        .from('messages')
        .insert(records);

      if (error && isMissingAiMetadataColumn(error)) {
        const fallbackRecords = records.map(({ ai_metadata, ...record }) => record);
        ({ error } = await supabase
          .from('messages')
          .insert(fallbackRecords));
      }

      if (error) {
        console.error(`Supabase batch insert error (chunk ${i / CHUNK_SIZE + 1}):`, error.message);
        return { success: false, error: error.message, count: totalInserted };
      }

      totalInserted += records.length;
    }

    return { success: true, count: totalInserted };
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

    // Exclude entries with future dates (e.g. incorrectly set to 2028)
    // so "latest" properties are those closest to today.
    query = query.lte('date_of_creation', new Date().toISOString());

    const { data, error, count } = await query
      .order('date_of_creation', { ascending: false })
      .order('id', { ascending: false })
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
    const safeIds = Array.isArray(ids)
      ? [...new Set(ids
          .map((id) => (typeof id === 'string' ? id.trim() : ''))
          .filter(Boolean))]
      : [];

    if (safeIds.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    const { data, error } = await supabase
      .from('messages')
      .delete()
      .in('id', safeIds)
      .select('id');

    if (error) throw error;
    // data is null when no rows matched (e.g. IDs not found or blocked by RLS)
    const deletedCount = Array.isArray(data) ? data.length : 0;
    return { success: true, deletedCount };
  },

  async getStats() {
    const { count: totalMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    const { data: files } = await supabase
      .from('messages')
      .select('source_file')
      .neq('source_file', '');

    const { data: senderRows } = await supabase
      .from('messages')
      .select('sender_name,sender_mobile')
      .limit(10000);

    const uniqueFiles = [...new Set(files?.map(f => f.source_file) || [])];
    const uniqueSenders = [
      ...new Set(
        (senderRows || [])
          .map((row) => {
            const mobile = String(row.sender_mobile || '').trim();
            const name = String(row.sender_name || '').trim().toLowerCase();
            return mobile || name || null;
          })
          .filter(Boolean)
      )
    ];

    return {
      totalMessages: totalMessages || 0,
      totalSenders: uniqueSenders.length,
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
    if (!supabase) return [];
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
  generateId,
  generateToken,
  verifyToken,
  corsHeaders,
  initDatabase
};
