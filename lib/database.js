const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'reallisting.json');
const JWT_SECRET = process.env.JWT_SECRET || 'reallisting_secret_key_2025_secure';

const DEFAULT_REGIONS = [
  'الحي الأول',
  'الحي الثاني',
  'الحي الثالث',
  'الحي الرابع',
  'الحي الخامس',
  'العليا',
  'الملقا',
  'النسيم',
  'الرمال',
  'المروج',
  'أخرى'
];

const SAMPLE_MESSAGES = [
  {
    sender_name: 'وسيط الحي الأول',
    sender_mobile: '01012345678',
    date_of_creation: '2026-04-01T09:30:00.000Z',
    source_file: 'seed-demo.txt',
    image_url: '',
    category: 'بيع',
    property_type: 'شقة',
    region: 'الحي الأول',
    purpose: 'سكني',
    message: 'شقة للبيع 160 متر في الحي الأول تشطيب سوبر لوكس بسعر مناسب. للتواصل 01012345678',
    ai_metadata: { district: 'الحي الأول', area: 160, price: 1850000, keywords: ['شقة', 'تشطيب', 'سوبر لوكس'] }
  },
  {
    sender_name: 'مكتب العليا',
    sender_mobile: '01023456789',
    date_of_creation: '2026-04-02T13:15:00.000Z',
    source_file: 'seed-demo.txt',
    image_url: '',
    category: 'إيجار',
    property_type: 'مكتب',
    region: 'العليا',
    purpose: 'تجاري',
    message: 'مكتب إداري للإيجار في العليا 90 متر مجهز بالكامل. الاتصال على 01023456789',
    ai_metadata: { district: 'العليا', area: 90, price: 22000, keywords: ['مكتب', 'إيجار', 'إداري'] }
  },
  {
    sender_name: 'شركة الرمال',
    sender_mobile: '01034567890',
    date_of_creation: '2026-04-03T17:45:00.000Z',
    source_file: 'import-sample.txt',
    image_url: '',
    category: 'بيع',
    property_type: 'أرض',
    region: 'الرمال',
    purpose: 'سكني',
    message: 'قطعة أرض للبيع في الرمال مساحة 300 متر على شارع رئيسي. للاستفسار 01034567890',
    ai_metadata: { district: 'الرمال', area: 300, price: 2600000, keywords: ['أرض', 'شارع رئيسي'] }
  }
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept'
};

function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password) + JWT_SECRET).digest('hex');
}

function generateToken(mobile, role = 'broker', isActive = false) {
  const payload = {
    mobile,
    role,
    isActive,
    exp: Date.now() + 24 * 60 * 60 * 1000
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
    if (expectedHash !== hash) return null;

    const payload = JSON.parse(data);
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createDefaultDb() {
  const now = new Date().toISOString();
  const regions = DEFAULT_REGIONS.map((name) => ({
    id: generateId(),
    name,
    created_at: now
  }));

  const adminUser = {
    id: generateId(),
    mobile: 'xinreal',
    password: hashPassword('zerocall'),
    name: 'Admin User',
    role: 'admin',
    is_active: true,
    subscription_end_date: null,
    created_at: now
  };

  const brokerUser = {
    id: generateId(),
    mobile: '01000000001',
    password: hashPassword('broker123'),
    name: 'وسيط تجريبي',
    role: 'broker',
    is_active: true,
    subscription_end_date: null,
    created_at: now
  };

  const messages = SAMPLE_MESSAGES.map((message) => ({
    id: generateId(),
    created_at: now,
    ...message
  }));

  return {
    users: [adminUser, brokerUser],
    messages,
    regions,
    reset_requests: []
  };
}

function loadDb() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial = createDefaultDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      regions: Array.isArray(parsed.regions) ? parsed.regions : [],
      reset_requests: Array.isArray(parsed.reset_requests) ? parsed.reset_requests : []
    };
  } catch {
    const fallback = createDefaultDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

function saveDb(db) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function sortByDateDesc(items, field) {
  return [...items].sort((a, b) => {
    const aValue = new Date(a[field] || a.created_at || 0).getTime();
    const bValue = new Date(b[field] || b.created_at || 0).getTime();
    return bValue - aValue;
  });
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function computeMessageFilters(messages) {
  const unique = (values) => [...new Set(values.filter(Boolean))];

  return {
    categories: unique(messages.map((item) => item.category)),
    propertyTypes: unique(messages.map((item) => item.property_type)),
    purposes: unique(messages.map((item) => item.purpose)),
    regions: unique(messages.map((item) => item.region))
  };
}

const users = {
  async create(data, passwordArg, nameArg, roleArg = 'broker') {
    const db = loadDb();
    const isObject = typeof data === 'object' && data !== null;
    const mobile = isObject ? String(data.mobile || '').trim() : String(data || '').trim();
    const password = isObject ? data.password : passwordArg;
    const name = isObject ? data.name || '' : nameArg || '';
    const role = isObject ? data.role || 'broker' : roleArg;
    const isActive = isObject ? Boolean(data.isActive) : role === 'admin';

    if (!mobile || !password) {
      return { success: false, error: 'Mobile and password are required' };
    }

    if (db.users.some((user) => user.mobile === mobile)) {
      return { success: false, error: 'User already exists' };
    }

    const user = {
      id: generateId(),
      mobile,
      password: hashPassword(password),
      name,
      role,
      is_active: isActive,
      subscription_end_date: null,
      created_at: new Date().toISOString()
    };

    db.users.push(user);
    saveDb(db);
    return { success: true, userId: user.id };
  },

  async findByMobile(mobile) {
    const db = loadDb();
    return db.users.find((user) => user.mobile === mobile) || null;
  },

  async getByMobile(mobile) {
    return this.findByMobile(mobile);
  },

  async findById(id) {
    const db = loadDb();
    return db.users.find((user) => user.id === id) || null;
  },

  async getById(id) {
    return this.findById(id);
  },

  async verifyPassword(mobile, password) {
    const user = await this.findByMobile(mobile);
    if (!user) return null;
    return user.password === hashPassword(password) ? user : null;
  },

  async update(id, updates) {
    const db = loadDb();
    const user = db.users.find((item) => item.id === id);
    if (!user) throw new Error('User not found');

    const nextUpdates = { ...updates };
    if (Object.prototype.hasOwnProperty.call(nextUpdates, 'password')) {
      nextUpdates.password = hashPassword(nextUpdates.password);
    }

    Object.assign(user, nextUpdates);
    saveDb(db);
    return user;
  },

  async updateSubscription(mobile, endDate, isActive) {
    const db = loadDb();
    const user = db.users.find((item) => item.mobile === mobile);
    if (!user) throw new Error('User not found');

    user.subscription_end_date = endDate instanceof Date ? endDate.toISOString() : endDate;
    user.is_active = Boolean(isActive);
    saveDb(db);
    return user;
  },

  async getAll() {
    const db = loadDb();
    return sortByDateDesc(db.users, 'created_at');
  },

  async updateProfile(mobile, updates) {
    const db = loadDb();
    const user = db.users.find((item) => item.mobile === mobile);
    if (!user) throw new Error('User not found');

    if (updates.name) user.name = updates.name;
    if (updates.password) user.password = hashPassword(updates.password);
    saveDb(db);
    return { success: true };
  }
};

function filterMessages(list, filters = {}) {
  return list.filter((message) => {
    if (filters.category && message.category !== filters.category) return false;
    if (filters.property_type && message.property_type !== filters.property_type) return false;
    if (filters.region && message.region !== filters.region) return false;
    if (filters.purpose && message.purpose !== filters.purpose) return false;

    if (filters.search) {
      const haystack = [
        message.message,
        message.sender_name,
        message.sender_mobile,
        message.region,
        message.property_type
      ].map(normalizeText).join(' ');

      if (!haystack.includes(normalizeText(filters.search))) {
        return false;
      }
    }

    return true;
  });
}

const messages = {
  async create(messageData) {
    const db = loadDb();
    const message = {
      id: messageData.id || generateId(),
      message: messageData.message || '',
      sender_name: messageData.sender_name || '',
      sender_mobile: messageData.sender_mobile || '',
      date_of_creation: messageData.date_of_creation || new Date().toISOString(),
      source_file: messageData.source_file || '',
      image_url: messageData.image_url || '',
      category: messageData.category || 'أخرى',
      property_type: messageData.property_type || 'أخرى',
      region: messageData.region || 'أخرى',
      purpose: messageData.purpose || 'أخرى',
      ai_metadata: messageData.ai_metadata || {},
      created_at: new Date().toISOString()
    };

    db.messages.push(message);
    saveDb(db);
    return { success: true, messageId: message.id };
  },

  async createBatch(messagesData) {
    const db = loadDb();
    let count = 0;

    messagesData.forEach((messageData) => {
      const duplicate = db.messages.find((existing) =>
        existing.message === (messageData.message || '') &&
        existing.sender_name === (messageData.sender_name || '') &&
        existing.sender_mobile === (messageData.sender_mobile || '')
      );

      if (duplicate) return;

      db.messages.push({
        id: messageData.id || generateId(),
        message: messageData.message || '',
        sender_name: messageData.sender_name || '',
        sender_mobile: messageData.sender_mobile || '',
        date_of_creation: messageData.date_of_creation || new Date().toISOString(),
        source_file: messageData.source_file || '',
        image_url: messageData.image_url || '',
        category: messageData.category || 'أخرى',
        property_type: messageData.property_type || 'أخرى',
        region: messageData.region || 'أخرى',
        purpose: messageData.purpose || 'أخرى',
        ai_metadata: messageData.ai_metadata || {},
        created_at: new Date().toISOString()
      });
      count += 1;
    });

    saveDb(db);
    return { success: true, count };
  },

  async getAll(filters = {}, limit = 100, offset = 0) {
    const db = loadDb();
    const filtered = sortByDateDesc(filterMessages(db.messages, filters), 'date_of_creation');
    return filtered.slice(offset, offset + limit);
  },

  async count(filters = {}) {
    const db = loadDb();
    return filterMessages(db.messages, filters).length;
  },

  async getById(id) {
    const db = loadDb();
    return db.messages.find((message) => message.id === id) || null;
  },

  async update(id, updates) {
    const db = loadDb();
    const message = db.messages.find((item) => item.id === id);
    if (!message) throw new Error('Message not found');
    Object.assign(message, updates);
    saveDb(db);
    return message;
  },

  async delete(id) {
    const db = loadDb();
    const before = db.messages.length;
    db.messages = db.messages.filter((message) => message.id !== id);
    saveDb(db);
    return { success: true, deletedCount: before - db.messages.length };
  },

  async deleteMultiple(ids) {
    const idSet = new Set(ids);
    const db = loadDb();
    const before = db.messages.length;
    db.messages = db.messages.filter((message) => !idSet.has(message.id));
    saveDb(db);
    return { success: true, deletedCount: before - db.messages.length };
  }
};

const regions = {
  async create(regionData) {
    const db = loadDb();
    const name = typeof regionData === 'string' ? regionData : regionData.name;
    if (!name) throw new Error('Region name is required');

    const existing = db.regions.find((region) => region.name === name);
    if (existing) return existing;

    const region = {
      id: generateId(),
      name,
      created_at: new Date().toISOString()
    };

    db.regions.push(region);
    saveDb(db);
    return region;
  },

  async getAll() {
    const db = loadDb();
    return [...db.regions];
  },

  async getById(id) {
    const db = loadDb();
    return db.regions.find((region) => region.id === id) || null;
  },

  async update(id, updates) {
    const db = loadDb();
    const region = db.regions.find((item) => item.id === id);
    if (!region) throw new Error('Region not found');
    Object.assign(region, updates);
    saveDb(db);
    return region;
  },

  async delete(id) {
    const db = loadDb();
    const before = db.regions.length;
    db.regions = db.regions.filter((region) => region.id !== id);
    saveDb(db);
    return { success: true, deletedCount: before - db.regions.length };
  }
};

async function deduplicateMessages() {
  const db = loadDb();
  const seen = new Set();
  const deduplicated = [];
  let duplicatesRemoved = 0;

  sortByDateDesc(db.messages, 'created_at').forEach((message) => {
    const signature = [
      normalizeText(message.sender_name),
      normalizeText(message.sender_mobile),
      normalizeText(message.message)
    ].join('||');

    if (seen.has(signature)) {
      duplicatesRemoved += 1;
      return;
    }

    seen.add(signature);
    deduplicated.push(message);
  });

  db.messages = deduplicated;
  saveDb(db);

  return {
    success: true,
    originalCount: deduplicated.length + duplicatesRemoved,
    duplicatesRemoved,
    newTotalCount: deduplicated.length
  };
}

async function createResetRequest(mobile) {
  const db = loadDb();
  const user = db.users.find((item) => item.mobile === mobile);
  if (!user) {
    return { success: true };
  }

  const existing = db.reset_requests.find((item) => item.mobile === mobile);
  if (!existing) {
    db.reset_requests.push({
      mobile,
      requested_at: new Date().toISOString()
    });
    saveDb(db);
  }

  return { success: true };
}

async function listResetRequests() {
  const db = loadDb();
  return sortByDateDesc(db.reset_requests, 'requested_at');
}

async function processResetRequest(mobile, action) {
  const db = loadDb();
  const requestIndex = db.reset_requests.findIndex((item) => item.mobile === mobile);
  if (requestIndex === -1) {
    throw new Error('Reset request not found');
  }

  if (action === 'approve') {
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const user = db.users.find((item) => item.mobile === mobile);
    if (user) {
      user.password = hashPassword(tempPassword);
    }
    db.reset_requests.splice(requestIndex, 1);
    saveDb(db);
    return { success: true, tempPassword };
  }

  db.reset_requests.splice(requestIndex, 1);
  saveDb(db);
  return { success: true };
}

async function getStats() {
  const db = loadDb();
  const filters = computeMessageFilters(db.messages);
  const totalFiles = new Set(
    db.messages.map((message) => message.source_file).filter(Boolean)
  ).size;
  const activeUsers = db.users.filter((user) => user.is_active);

  return {
    users: {
      total: db.users.length,
      active: activeUsers.length
    },
    messages: {
      total: db.messages.length
    },
    regions: {
      total: db.regions.length
    },
    totalMessages: db.messages.length,
    totalFiles,
    totalSubscribers: activeUsers.length,
    filters
  };
}

async function initDatabase() {
  const db = loadDb();
  saveDb(db);
  return {
    status: 'ok',
    file: DB_FILE
  };
}

module.exports = {
  DB_FILE,
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
