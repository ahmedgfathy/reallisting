const initSqlJs = require('sql.js');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'reallisting.db');

let db = null;
let dbInitialized = false;

const JWT_SECRET = process.env.JWT_SECRET || 'reallisting_secret_key_2025_secure';

async function initDatabase() {
  if (dbInitialized && db) return db;

  const SQL = await initSqlJs();

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      mobile TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'broker',
      is_active INTEGER DEFAULT 0,
      subscription_end_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      message TEXT,
      sender_name TEXT,
      sender_mobile TEXT,
      date_of_creation TEXT,
      source_file TEXT,
      image_url TEXT,
      category TEXT DEFAULT 'أخرى',
      property_type TEXT DEFAULT 'أخرى',
      region TEXT DEFAULT 'أخرى',
      purpose TEXT DEFAULT 'أخرى',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS regions (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_messages_category ON messages(category)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_property_type ON messages(property_type)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_region ON messages(region)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_purpose ON messages(purpose)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date_of_creation)');
  db.run('CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile)');

  saveDatabase();
  dbInitialized = true;
  console.log('✅ SQLite database initialized');
  return db;
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

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

const users = {
  async create(mobile, password, name = '') {
    await initDatabase();
    const id = generateId();
    const hashedPassword = hashPassword(password);
    try {
      db.run('INSERT INTO users (id, mobile, password, name) VALUES (?, ?, ?, ?)', [id, mobile, hashedPassword, name]);
      saveDatabase();
      return { success: true, userId: id };
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        return { success: false, error: 'User already exists' };
      }
      return { success: false, error: error.message };
    }
  },

  async findByMobile(mobile) {
    await initDatabase();
    const result = db.exec('SELECT * FROM users WHERE mobile = ?', [mobile]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    const [row] = result[0].values;
    const columns = result[0].columns;
    const user = {};
    columns.forEach((col, i) => user[col] = row[i]);
    return user;
  },

  async findById(id) {
    await initDatabase();
    const result = db.exec('SELECT * FROM users WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    const [row] = result[0].values;
    const columns = result[0].columns;
    const user = {};
    columns.forEach((col, i) => user[col] = row[i]);
    return user;
  },

  async verifyPassword(mobile, password) {
    const user = await this.findByMobile(mobile);
    if (!user) return null;
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) return null;
    return user;
  },

  async updateActive(userId, isActive) {
    await initDatabase();
    db.run('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, userId]);
    saveDatabase();
  },

  async updateSubscription(userId, endDate) {
    await initDatabase();
    db.run('UPDATE users SET subscription_end_date = ? WHERE id = ?', [endDate, userId]);
    saveDatabase();
  },

  async getAll() {
    await initDatabase();
    const result = db.exec('SELECT id, mobile, name, role, is_active, subscription_end_date, created_at FROM users ORDER BY created_at DESC');
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const user = {};
      columns.forEach((col, i) => user[col] = row[i]);
      return user;
    });
  }
};

const messages = {
  async create(data) {
    await initDatabase();
    const id = generateId();
    db.run(`
      INSERT INTO messages (id, message, sender_name, sender_mobile, date_of_creation, source_file, image_url, category, property_type, region, purpose)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.message || '',
      data.sender_name || '',
      data.sender_mobile || '',
      data.date_of_creation || new Date().toISOString(),
      data.source_file || '',
      data.image_url || '',
      data.category || 'أخرى',
      data.property_type || 'أخرى',
      data.region || 'أخرى',
      data.purpose || 'أخرى'
    ]);
    saveDatabase();
    return { success: true, id };
  },

  async get(options = {}) {
    await initDatabase();
    const {
      page = 1,
      limit = 50,
      search = '',
      category = '',
      propertyType = '',
      region = '',
      purpose = ''
    } = options;

    let query = 'SELECT * FROM messages WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (message LIKE ? OR sender_name LIKE ? OR sender_mobile LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (category && category !== 'الكل') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (propertyType && propertyType !== 'الكل') {
      query += ' AND property_type = ?';
      params.push(propertyType);
    }

    if (region && region !== 'الكل') {
      query += ' AND region = ?';
      params.push(region);
    }

    if (purpose && purpose !== 'الكل') {
      query += ' AND purpose = ?';
      params.push(purpose);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = db.exec(countQuery, params);
    const count = countResult.length > 0 ? countResult[0].values[0][0] : 0;

    query += ' ORDER BY date_of_creation DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    const result = db.exec(query, params);

    const data = [];
    if (result.length > 0) {
      const columns = result[0].columns;
      result[0].values.forEach(row => {
        const msg = {};
        columns.forEach((col, i) => msg[col] = row[i]);
        data.push(msg);
      });
    }

    return {
      success: true,
      data,
      total: count
    };
  },

  async delete(id) {
    await initDatabase();
    db.run('DELETE FROM messages WHERE id = ?', [id]);
    saveDatabase();
    return { success: true };
  },

  async deleteMultiple(ids) {
    await initDatabase();
    const placeholders = ids.map(() => '?').join(',');
    db.exec(`DELETE FROM messages WHERE id IN (${placeholders})`, ids);
    saveDatabase();
    return { success: true, deletedCount: ids.length };
  },

  async getStats() {
    await initDatabase();
    const totalResult = db.exec('SELECT COUNT(*) as count FROM messages');
    const totalMessages = totalResult.length > 0 ? totalResult[0].values[0][0] : 0;

    const filesResult = db.exec('SELECT DISTINCT source_file FROM messages WHERE source_file != ""');
    const files = filesResult.length > 0 ? filesResult[0].values.map(row => row[0]) : [];

    return {
      totalMessages,
      totalFiles: files.length,
      files
    };
  }
};

const regions = {
  async getAll() {
    await initDatabase();
    const result = db.exec('SELECT * FROM regions ORDER BY name');
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const region = {};
      columns.forEach((col, i) => region[col] = row[i]);
      return region;
    });
  },

  async create(name) {
    await initDatabase();
    const id = generateId();
    try {
      db.run('INSERT INTO regions (id, name) VALUES (?, ?)', [id, name]);
      saveDatabase();
      return { success: true, id };
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        return { success: false, error: 'Region already exists' };
      }
      return { success: false, error: error.message };
    }
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};

initDatabase().catch(console.error);

module.exports = {
  get db() {
    return db;
  },
  users,
  messages,
  regions,
  generateToken,
  verifyToken,
  corsHeaders,
  saveDatabase,
  initDatabase
};
