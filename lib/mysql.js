// MySQL/MariaDB Database Connection
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'zerocall',
  database: process.env.MYSQL_DATABASE || 'reallisting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL connection error:', error.message);
    return false;
  }
}

// Initialize Database Tables
async function initDatabase() {
  try {
    await testConnection();
    console.log('✅ MySQL database initialized');
  } catch (error) {
    console.error('Error initializing database:', error.message);
  }
}

// User operations
async function createUser(userData) {
  const { id, mobile, password, name, role } = userData;
  const [result] = await pool.execute(
    'INSERT INTO users (id, mobile, password, name, role) VALUES (?, ?, ?, ?, ?)',
    [id, mobile, password, name || null, role || 'broker']
  );
  return result;
}

async function getUserByMobile(mobile) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE mobile = ?',
    [mobile]
  );
  return rows[0];
}

async function getUserById(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function updateUser(id, updates) {
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  const [result] = await pool.execute(
    `UPDATE users SET ${fields} WHERE id = ?`,
    values
  );
  return result;
}

async function getAllUsers() {
  const [rows] = await pool.execute('SELECT * FROM users ORDER BY created_at DESC');
  return rows;
}

// Message operations
async function createMessage(messageData) {
  const {
    id, message, sender_name, sender_mobile, date_of_creation,
    source_file, image_url, category, property_type, region, purpose
  } = messageData;
  
  // Convert ISO datetime to MySQL format (YYYY-MM-DD HH:MM:SS)
  let mysqlDate = null;
  if (date_of_creation) {
    try {
      const dateObj = new Date(date_of_creation);
      mysqlDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
    } catch (e) {
      mysqlDate = null;
    }
  }
  
  // Convert undefined to null for MySQL compatibility
  const [result] = await pool.execute(
    `INSERT INTO messages 
    (id, message, sender_name, sender_mobile, date_of_creation, source_file, image_url, 
     category, property_type, region, purpose) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, 
      message ?? null, 
      sender_name ?? null, 
      sender_mobile ?? null, 
      mysqlDate, 
      source_file ?? null, 
      image_url ?? null, 
      category ?? 'أخرى', 
      property_type ?? 'أخرى', 
      region ?? 'أخرى', 
      purpose ?? 'أخرى'
    ]
  );
  return result;
}

async function getMessages(filters = {}, limit = 100, offset = 0) {
  let query = 'SELECT * FROM messages WHERE 1=1';
  const params = [];

  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters.property_type) {
    query += ' AND property_type = ?';
    params.push(filters.property_type);
  }
  if (filters.region) {
    query += ' AND region = ?';
    params.push(filters.region);
  }
  if (filters.purpose) {
    query += ' AND purpose = ?';
    params.push(filters.purpose);
  }
  if (filters.search) {
    query += ' AND (message LIKE ? OR sender_name LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  query += ' ORDER BY date_of_creation DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await pool.execute(query, params);
  return rows;
}

async function getMessageById(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM messages WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function updateMessage(id, updates) {
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  const [result] = await pool.execute(
    `UPDATE messages SET ${fields} WHERE id = ?`,
    values
  );
  return result;
}

async function deleteMessage(id) {
  const [result] = await pool.execute(
    'DELETE FROM messages WHERE id = ?',
    [id]
  );
  return result;
}

async function getMessageCount(filters = {}) {
  let query = 'SELECT COUNT(*) as count FROM messages WHERE 1=1';
  const params = [];

  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters.property_type) {
    query += ' AND property_type = ?';
    params.push(filters.property_type);
  }
  if (filters.region) {
    query += ' AND region = ?';
    params.push(filters.region);
  }
  if (filters.purpose) {
    query += ' AND purpose = ?';
    params.push(filters.purpose);
  }

  const [rows] = await pool.execute(query, params);
  return rows[0].count;
}

// Region operations
async function createRegion(regionData) {
  const { id, name } = regionData;
  const [result] = await pool.execute(
    'INSERT INTO regions (id, name) VALUES (?, ?)',
    [id, name]
  );
  return result;
}

async function getAllRegions() {
  const [rows] = await pool.execute('SELECT * FROM regions ORDER BY name');
  return rows;
}

async function getRegionById(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM regions WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function updateRegion(id, updates) {
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  const [result] = await pool.execute(
    `UPDATE regions SET ${fields} WHERE id = ?`,
    values
  );
  return result;
}

async function deleteRegion(id) {
  const [result] = await pool.execute(
    'DELETE FROM regions WHERE id = ?',
    [id]
  );
  return result;
}

// Statistics
async function getStats() {
  const [[userStats]] = await pool.execute(
    'SELECT COUNT(*) as total, SUM(is_active) as active FROM users'
  );
  const [[messageStats]] = await pool.execute(
    'SELECT COUNT(*) as total FROM messages'
  );
  const [[regionStats]] = await pool.execute(
    'SELECT COUNT(*) as total FROM regions'
  );

  return {
    users: {
      total: userStats.total,
      active: userStats.active || 0
    },
    messages: {
      total: messageStats.total
    },
    regions: {
      total: regionStats.total
    }
  };
}

module.exports = {
  pool,
  testConnection,
  initDatabase,
  // User operations
  createUser,
  getUserByMobile,
  getUserById,
  updateUser,
  getAllUsers,
  // Message operations
  createMessage,
  getMessages,
  getMessageById,
  updateMessage,
  deleteMessage,
  getMessageCount,
  // Region operations
  createRegion,
  getAllRegions,
  getRegionById,
  updateRegion,
  deleteRegion,
  // Statistics
  getStats
};
