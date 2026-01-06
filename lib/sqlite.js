const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

// Initialize SQLite Database
const dbPath = path.join(__dirname, '..', 'data', 'reallisting.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'reallisting_secret_key_2025_secure';

// Initialize Database Schema
function initDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      mobile TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'broker',
      is_active INTEGER DEFAULT 0,
      subscription_end_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Messages table
  db.exec(`
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Regions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS regions (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_category ON messages(category);
    CREATE INDEX IF NOT EXISTS idx_messages_property_type ON messages(property_type);
    CREATE INDEX IF NOT EXISTS idx_messages_region ON messages(region);
    CREATE INDEX IF NOT EXISTS idx_messages_purpose ON messages(purpose);
    CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date_of_creation);
    CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
  `);

  console.log('✅ SQLite database initialized');
}

// Generate ID
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

// Hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// Generate token
function generateToken(mobile, role = 'broker', isActive = false) {
  const payload = {
    mobile,
    role,
    isActive,
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

// User operations
const users = {
  create(mobile, password, name = '') {
    const id = generateId();
    const hashedPassword = hashPassword(password);
    try {
      const stmt = db.prepare('INSERT INTO users (id, mobile, password, name) VALUES (?, ?, ?, ?)');
      stmt.run(id, mobile, hashedPassword, name);
      return { success: true, userId: id };
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        return { success: false, error: 'User already exists' };
      }
      return { success: false, error: error.message };
    }
  },

  findByMobile(mobile) {
    const stmt = db.prepare('SELECT * FROM users WHERE mobile = ?');
    return stmt.get(mobile);
  },

  findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  },

  verifyPassword(mobile, password) {
    const user = this.findByMobile(mobile);
    if (!user) return null;
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) return null;
    return user;
  },

  updateActive(userId, isActive) {
    const stmt = db.prepare('UPDATE users SET is_active = ? WHERE id = ?');
    stmt.run(isActive ? 1 : 0, userId);
  },

  updateSubscription(userId, endDate) {
    const stmt = db.prepare('UPDATE users SET subscription_end_date = ? WHERE id = ?');
    stmt.run(endDate, userId);
  },

  getAll() {
    const stmt = db.prepare('SELECT id, mobile, name, role, is_active, subscription_end_date, created_at FROM users ORDER BY created_at DESC');
    return stmt.all();
  }
};

// Messages operations
const messages = {
  create(data) {
    const id = generateId();
    const stmt = db.prepare(`
      INSERT INTO messages (id, message, sender_name, sender_mobile, date_of_creation, source_file, image_url, category, property_type, region, purpose)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
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
    );
    return { success: true, id };
  },

  get(options = {}) {
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

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countStmt = db.prepare(countQuery);
    const { count } = countStmt.get(...params);

    // Get paginated results
    query += ' ORDER BY date_of_creation DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const stmt = db.prepare(query);
    const data = stmt.all(...params);

    return {
      success: true,
      data,
      total: count
    };
  },

  delete(id) {
    const stmt = db.prepare('DELETE FROM messages WHERE id = ?');
    const result = stmt.run(id);
    return { success: result.changes > 0 };
  },

  deleteMultiple(ids) {
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`DELETE FROM messages WHERE id IN (${placeholders})`);
    const result = stmt.run(...ids);
    return { success: true, deletedCount: result.changes };
  },

  getStats() {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM messages');
    const { count: totalMessages } = totalStmt.get();

    const filesStmt = db.prepare('SELECT DISTINCT source_file FROM messages WHERE source_file != ""');
    const files = filesStmt.all();

    return {
      totalMessages,
      totalFiles: files.length,
      files: files.map(f => f.source_file)
    };
  }
};

// Regions operations
const regions = {
  getAll() {
    const stmt = db.prepare('SELECT * FROM regions ORDER BY name');
    return stmt.all();
  },

  create(name) {
    const id = generateId();
    try {
      const stmt = db.prepare('INSERT INTO regions (id, name) VALUES (?, ?)');
      stmt.run(id, name);
      return { success: true, id };
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        return { success: false, error: 'Region already exists' };
      }
      return { success: false, error: error.message };
    }
  }
};

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};

// Initialize database on module load
initDatabase();

module.exports = {
  db,
  users,
  messages,
  regions,
  generateToken,
  verifyToken,
  corsHeaders
};
