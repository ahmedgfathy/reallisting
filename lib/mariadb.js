const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'zerocall',
  database: 'reallisting',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const JWT_SECRET = process.env.JWT_SECRET || 'reallisting_secret_key_2025_secure';
const crypto = require('crypto');

async function initDatabase() {
  const connection = await pool.getConnection();
  
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(32) PRIMARY KEY,
        mobile VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(64) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'broker',
        is_active TINYINT(1) DEFAULT 0,
        subscription_end_date DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mobile (mobile)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(32) PRIMARY KEY,
        message TEXT,
        sender_name VARCHAR(255),
        sender_mobile VARCHAR(20),
        date_of_creation DATETIME,
        source_file VARCHAR(255),
        image_url VARCHAR(500),
        category VARCHAR(100) DEFAULT 'أخرى',
        property_type VARCHAR(100) DEFAULT 'أخرى',
        region VARCHAR(100) DEFAULT 'أخرى',
        purpose VARCHAR(100) DEFAULT 'أخرى',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_property_type (property_type),
        INDEX idx_region (region),
        INDEX idx_purpose (purpose),
        INDEX idx_date (date_of_creation)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS regions (
        id VARCHAR(32) PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ MariaDB database initialized');
  } finally {
    connection.release();
  }
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
  async create(data) {
    // Support both object and positional arguments
    const mobile = typeof data === 'string' ? data : data.mobile;
    const password = typeof data === 'string' ? arguments[1] : data.password;
    const name = typeof data === 'string' ? arguments[2] : data.name || '';
    const role = typeof data === 'object' ? (data.role || 'broker') : 'broker';
    const isActive = typeof data === 'object' ? (data.isActive || 0) : 0;
    
    const id = generateId();
    const hashedPassword = hashPassword(password);
    try {
      await pool.query(
        'INSERT INTO users (id, mobile, password, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [id, mobile, hashedPassword, name, role, isActive]
      );
      return { success: true, userId: id };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return { success: false, error: 'User already exists' };
      }
      return { success: false, error: error.message };
    }
  },

  async findByMobile(mobile) {
    const [rows] = await pool.query('SELECT * FROM users WHERE mobile = ?', [mobile]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async verifyPassword(mobile, password) {
    const user = await this.findByMobile(mobile);
    if (!user) return null;
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) return null;
    return user;
  },

  async updateActive(userId, isActive) {
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, userId]);
  },

  async updateSubscription(userId, endDate) {
    await pool.query('UPDATE users SET subscription_end_date = ? WHERE id = ?', [endDate, userId]);
  },

  async getAll() {
    const [rows] = await pool.query(
      'SELECT id, mobile, name, role, is_active, subscription_end_date, created_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  }
};

const messages = {
  async create(data) {
    const id = generateId();
    
    // Convert ISO date to MySQL datetime format
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };
    
    await pool.query(
      `INSERT INTO messages (id, message, sender_name, sender_mobile, date_of_creation, source_file, image_url, category, property_type, region, purpose)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.message || '',
        data.sender_name || '',
        data.sender_mobile || '',
        formatDate(data.date_of_creation),
        data.source_file || '',
        data.image_url || '',
        data.category || 'أخرى',
        data.property_type || 'أخرى',
        data.region || 'أخرى',
        data.purpose || 'أخرى'
      ]
    );
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
    const [countRows] = await pool.query(countQuery, params);
    const count = countRows[0].count;

    query += ' ORDER BY date_of_creation DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    const [rows] = await pool.query(query, params);

    return {
      success: true,
      data: rows,
      total: count
    };
  },

  async delete(id) {
    await pool.query('DELETE FROM messages WHERE id = ?', [id]);
    return { success: true };
  },

  async deleteMultiple(ids) {
    const placeholders = ids.map(() => '?').join(',');
    await pool.query(`DELETE FROM messages WHERE id IN (${placeholders})`, ids);
    return { success: true, deletedCount: ids.length };
  },

  async getStats() {
    const [totalRows] = await pool.query('SELECT COUNT(*) as count FROM messages');
    const totalMessages = totalRows[0].count;

    const [fileRows] = await pool.query('SELECT DISTINCT source_file FROM messages WHERE source_file != ""');
    const files = fileRows.map(row => row.source_file);

    return {
      totalMessages,
      totalFiles: files.length,
      files
    };
  }
};

const regions = {
  async getAll() {
    const [rows] = await pool.query('SELECT * FROM regions ORDER BY name');
    return rows;
  },

  async create(name) {
    const id = generateId();
    try {
      await pool.query('INSERT INTO regions (id, name) VALUES (?, ?)', [id, name]);
      return { success: true, id };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
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
  pool,
  users,
  messages,
  regions,
  generateToken,
  verifyToken,
  corsHeaders,
  initDatabase
};
