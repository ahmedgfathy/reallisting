/**
 * Supabase Adapter
 * Wraps lib/supabase.js to expose the same interface as lib/database.js.
 * Used in production (Vercel) when SUPABASE_URL env var is set.
 */
const crypto = require('crypto');

const {
  supabase,
  users: _users,
  messages: _messages,
  regions: _regions,
  generateId,
  generateToken,
  verifyToken,
  corsHeaders
} = require('./supabase');

const JWT_SECRET =
  process.env.SUPABASE_JWT_SECRET ||
  process.env.JWT_SECRET ||
  'reallisting_secret_key_2025_secure';

/** Placeholder matching the DB_FILE export in lib/database.js */
const DB_FILE = 'supabase';

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password) + JWT_SECRET).digest('hex');
}

// ---------------------------------------------------------------------------
// Users — delegates to lib/supabase.js and adds missing methods
// ---------------------------------------------------------------------------
const users = {
  create: (...args) => _users.create(...args),
  findByMobile: (mobile) => _users.findByMobile(mobile),
  findById: (id) => _users.findById(id),
  verifyPassword: (mobile, password) => _users.verifyPassword(mobile, password),
  getAll: () => _users.getAll(),
  updateProfile: (mobile, updates) => _users.updateProfile(mobile, updates),

  /** Alias matching lib/database.js */
  getByMobile: (mobile) => _users.findByMobile(mobile),
  /** Alias matching lib/database.js */
  getById: (id) => _users.findById(id),

  /** Full update method (lib/database.js signature) */
  async update(id, updates) {
    const dbUpdates = { ...updates };
    if (Object.prototype.hasOwnProperty.call(dbUpdates, 'password')) {
      dbUpdates.password = hashPassword(dbUpdates.password);
    }
    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * updateSubscription(mobile, endDate, isActive)
   * Matches lib/database.js signature (mobile-based, not userId-based).
   */
  async updateSubscription(mobile, endDate, isActive) {
    const endDateStr = endDate instanceof Date ? endDate.toISOString() : endDate;
    const { error } = await supabase
      .from('users')
      .update({ subscription_end_date: endDateStr, is_active: Boolean(isActive) })
      .eq('mobile', mobile);
    if (error) throw new Error(error.message);
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', mobile)
      .single();
    return data;
  }
};

// ---------------------------------------------------------------------------
// Messages — delegates to lib/supabase.js and adds missing methods
// ---------------------------------------------------------------------------
const messages = {
  create: (data) => _messages.create(data),
  createBatch: (data) => _messages.createBatch(data),
  delete: (id) => _messages.delete(id),
  deleteMultiple: (ids) => _messages.deleteMultiple(ids),
  getFilterValues: () => _messages.getFilterValues(),

  /**
   * getAll(filters, limit, offset) — matches lib/database.js signature.
   * Internally maps to _messages.get() which uses page-based pagination.
   */
  async getAll(filters = {}, limit = 100, offset = 0) {
    const page = Math.floor(offset / limit) + 1;
    const result = await _messages.get({
      page,
      limit,
      search: filters.search || '',
      category: filters.category || '',
      propertyType: filters.property_type || '',
      region: filters.region || '',
      purpose: filters.purpose || ''
    });
    return result.success ? (result.data || []) : [];
  },

  /** count(filters) — missing in lib/supabase.js */
  async count(filters = {}) {
    let query = supabase.from('messages').select('*', { count: 'exact', head: true });
    if (filters.search) {
      query = query.or(
        `message.ilike.%${filters.search}%,sender_name.ilike.%${filters.search}%,sender_mobile.ilike.%${filters.search}%`
      );
    }
    if (filters.category && filters.category !== 'الكل') {
      query = query.eq('category', filters.category);
    }
    if (filters.property_type && filters.property_type !== 'الكل') {
      query = query.eq('property_type', filters.property_type);
    }
    if (filters.region && filters.region !== 'الكل') {
      query = query.eq('region', filters.region);
    }
    if (filters.purpose && filters.purpose !== 'الكل') {
      query = query.eq('purpose', filters.purpose);
    }
    const { count, error } = await query;
    return error ? 0 : (count || 0);
  },

  /** getById(id) — missing in lib/supabase.js */
  async getById(id) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();
    return error ? null : data;
  },

  /** update(id, updates) — missing in lib/supabase.js */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
};

// ---------------------------------------------------------------------------
// Regions — delegates to lib/supabase.js and adds missing methods
// ---------------------------------------------------------------------------
const regions = {
  create: (name) => _regions.create(name),
  getAll: () => _regions.getAll(),

  async getById(id) {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('id', id)
      .single();
    return error ? null : data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('regions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from('regions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  }
};

// ---------------------------------------------------------------------------
// Reset Requests — stored in the reset_requests Supabase table
// ---------------------------------------------------------------------------
async function createResetRequest(mobile) {
  const user = await users.findByMobile(mobile);
  if (!user) return { success: true };

  const { data: existing } = await supabase
    .from('reset_requests')
    .select('id')
    .eq('mobile', mobile)
    .maybeSingle();

  if (!existing) {
    await supabase
      .from('reset_requests')
      .insert({ mobile, requested_at: new Date().toISOString() });
  }

  return { success: true };
}

async function listResetRequests() {
  const { data, error } = await supabase
    .from('reset_requests')
    .select('*')
    .order('requested_at', { ascending: false });
  return error ? [] : (data || []);
}

async function processResetRequest(mobile, action) {
  const { data: request, error } = await supabase
    .from('reset_requests')
    .select('*')
    .eq('mobile', mobile)
    .maybeSingle();

  if (error || !request) throw new Error('Reset request not found');

  if (action === 'approve') {
    const tempPassword = crypto.randomBytes(4).toString('hex');
    await supabase
      .from('users')
      .update({ password: hashPassword(tempPassword) })
      .eq('mobile', mobile);
    await supabase.from('reset_requests').delete().eq('mobile', mobile);
    return { success: true, tempPassword };
  }

  await supabase.from('reset_requests').delete().eq('mobile', mobile);
  return { success: true };
}

// ---------------------------------------------------------------------------
// deduplicateMessages — fetches in pages to avoid memory exhaustion
// ---------------------------------------------------------------------------
async function deduplicateMessages() {
  const PAGE_SIZE = 1000;
  let page = 0;
  let allMessages = [];

  // Fetch all messages in pages to limit memory usage
  while (true) {
    const { data, error } = await supabase
      .from('messages')
      .select('id, message, sender_name, sender_mobile, created_at')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    allMessages = allMessages.concat(data);
    if (data.length < PAGE_SIZE) break;
    page += 1;
  }

  const seen = new Set();
  const toDelete = [];
  const originalCount = (allMessages || []).length;

  for (const msg of (allMessages || [])) {
    const key = [
      (msg.sender_name || '').toLowerCase(),
      (msg.sender_mobile || '').toLowerCase(),
      (msg.message || '').toLowerCase()
    ].join('||');

    if (seen.has(key)) {
      toDelete.push(msg.id);
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length > 0) {
    await supabase.from('messages').delete().in('id', toDelete);
  }

  return {
    success: true,
    originalCount,
    duplicatesRemoved: toDelete.length,
    newTotalCount: originalCount - toDelete.length
  };
}

// ---------------------------------------------------------------------------
// getStats — aggregated statistics
// ---------------------------------------------------------------------------
async function getStats() {
  const [
    { count: totalMessages },
    { count: totalUsers },
    { count: activeUsers },
    { count: totalRegions },
    { data: sourceFiles },
    { data: senderRows }
  ] = await Promise.all([
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('regions').select('*', { count: 'exact', head: true }),
    supabase
      .from('messages')
      .select('source_file')
      .neq('source_file', '')
      .limit(5000),  // limit to prevent memory issues on large datasets
    supabase
      .from('messages')
      .select('sender_name,sender_mobile')
      .limit(10000)
  ]);

  const uniqueFiles = [
    ...new Set((sourceFiles || []).map((f) => f.source_file).filter(Boolean))
  ];
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
  const filterValues = await _messages.getFilterValues();

  return {
    users: { total: totalUsers || 0, active: activeUsers || 0 },
    messages: { total: totalMessages || 0 },
    regions: { total: totalRegions || 0 },
    totalMessages: totalMessages || 0,
    totalSenders: uniqueSenders.length,
    totalFiles: uniqueFiles.length,
    totalSubscribers: activeUsers || 0,
    filters: filterValues
  };
}

// ---------------------------------------------------------------------------
// Default admin users — seeded automatically when running locally with Supabase
// (Vercel deploys seed via the vercel-build script instead)
// ---------------------------------------------------------------------------
const DEFAULT_ADMINS = [
  {
    id: 'c1f6e1ad5f7d65ec2ae6fdcf375839e8',
    mobile: 'admin',
    password: 'Admin@2025',
    name: 'Super Admin',
    role: 'admin',
    is_active: true
  },
  {
    id: '0faf85ee1c377fa2e23d099536d2870d',
    mobile: 'xinreal',
    password: 'zerocall',
    name: 'XinReal Admin',
    role: 'admin',
    is_active: true
  }
];

async function ensureAdminUsers() {
  for (const admin of DEFAULT_ADMINS) {
    const record = {
      id: admin.id,
      mobile: admin.mobile,
      password: hashPassword(admin.password),
      name: admin.name,
      role: admin.role,
      is_active: admin.is_active
    };
    const { error } = await supabase
      .from('users')
      .upsert(record, { onConflict: 'mobile' });
    if (error) {
      console.warn(`⚠️  Could not seed admin user "${admin.mobile}" (login may fail if user does not exist):`, error.message);
    }
  }
}

// ---------------------------------------------------------------------------
// initDatabase — verify Supabase connection
// ---------------------------------------------------------------------------
async function initDatabase() {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
    } else {
      console.log('✅ Supabase connection verified');
      await ensureAdminUsers();
    }
  } catch (err) {
    console.error('❌ Supabase initialization error:', err.message);
  }
  return { status: 'ok', database: 'supabase' };
}

// ---------------------------------------------------------------------------
// Exports — matches lib/database.js exports exactly
// ---------------------------------------------------------------------------
module.exports = {
  DB_FILE,
  supabase,
  users,
  messages,
  regions,
  generateId,
  generateToken,
  verifyToken,
  hashPassword,
  corsHeaders,
  getStats,
  initDatabase,
  deduplicateMessages,
  createResetRequest,
  listResetRequests,
  processResetRequest
};
