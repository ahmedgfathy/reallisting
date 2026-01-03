-- Import data to Prisma/Contabo PostgreSQL
-- Run this in your Prisma database SQL console

-- ===========================================
-- STEP 1: Create Schema (if not exists)
-- ===========================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  mobile VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'broker',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sender table
CREATE TABLE IF NOT EXISTS sender (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  first_seen_date TEXT,
  first_seen_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create property_types table
CREATE TABLE IF NOT EXISTS property_types (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purposes table
CREATE TABLE IF NOT EXISTS purposes (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  message TEXT,
  date_of_creation TEXT,
  source_file TEXT,
  image_url TEXT,
  sender_id INTEGER REFERENCES sender(id),
  region_id INTEGER REFERENCES regions(id),
  property_type_id INTEGER REFERENCES property_types(id),
  category_id INTEGER REFERENCES categories(id),
  purpose_id INTEGER REFERENCES purposes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sender_mobile ON sender(mobile);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_region_id ON messages(region_id);
CREATE INDEX IF NOT EXISTS idx_messages_property_type_id ON messages(property_type_id);
CREATE INDEX IF NOT EXISTS idx_messages_category_id ON messages(category_id);
CREATE INDEX IF NOT EXISTS idx_messages_purpose_id ON messages(purpose_id);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);

-- Create view
CREATE OR REPLACE VIEW messages_with_sender AS
SELECT 
  m.id,
  m.message,
  m.date_of_creation,
  m.source_file,
  m.image_url,
  c.name as category,
  pt.name as property_type,
  r.name as region,
  p.name as purpose,
  s.id as sender_id,
  s.name as sender_name,
  s.mobile as sender_mobile,
  s.first_seen_date,
  s.first_seen_time,
  m.created_at
FROM messages m
LEFT JOIN sender s ON m.sender_id = s.id
LEFT JOIN regions r ON m.region_id = r.id
LEFT JOIN property_types pt ON m.property_type_id = pt.id
LEFT JOIN categories c ON m.category_id = c.id
LEFT JOIN purposes p ON m.purpose_id = p.id;

-- ===========================================
-- STEP 2: Import Data
-- Paste your CSV data here using COPY FROM or INSERT
-- ===========================================

-- Example: Import users (replace with your actual data)
-- COPY users FROM '/path/to/users.csv' WITH CSV HEADER;

-- Or use INSERT statements for small datasets
-- INSERT INTO users (id, mobile, password, role, is_active, created_at) VALUES (...);

-- Verify data
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'sender', COUNT(*) FROM sender
UNION ALL
SELECT 'regions', COUNT(*) FROM regions
UNION ALL
SELECT 'property_types', COUNT(*) FROM property_types
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'purposes', COUNT(*) FROM purposes
UNION ALL
SELECT 'messages', COUNT(*) FROM messages;
