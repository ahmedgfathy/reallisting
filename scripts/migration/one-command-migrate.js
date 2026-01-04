const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = 'https://gxyrpboyubpycejlkxue.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk';
const PRISMA_URL = 'postgres://823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1:sk_iv0LK6rujPpicqk6uuUaE@db.prisma.io:5432/postgres?sslmode=require';

console.log('🚀 Starting One-Command Migration...\n');

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const prismaClient = new Client({ connectionString: PRISMA_URL });
const tableColumnsCache = new Map();

async function getTableColumns(tableName) {
  if (tableColumnsCache.has(tableName)) return tableColumnsCache.get(tableName);
  const res = await prismaClient.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
    [tableName]
  );
  const cols = res.rows.map(r => r.column_name);
  tableColumnsCache.set(tableName, cols);
  return cols;
}

async function exportTable(tableName) {
  console.log(`📤 Exporting ${tableName}...`);
  let allData = [];
  let from = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + batchSize - 1);
    
    if (error) {
      console.error(`❌ Error exporting ${tableName}:`, error.message);
      return [];
    }
    
    if (!data || data.length === 0) break;
    
    allData = allData.concat(data);
    from += batchSize;
    
    if (data.length < batchSize) break;
  }
  
  console.log(`✅ Exported ${allData.length} rows from ${tableName}`);
  return allData;
}

async function createSchema() {
  console.log('\n📊 Creating database schema...');
  
  const schema = `
    -- Drop existing tables
    DROP VIEW IF EXISTS messages_with_sender CASCADE;
    DROP TABLE IF EXISTS messages CASCADE;
    DROP TABLE IF EXISTS purposes CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS property_types CASCADE;
    DROP TABLE IF EXISTS regions CASCADE;
    DROP TABLE IF EXISTS sender CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    -- Create users table (matches Supabase export)
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      mobile VARCHAR(20) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name TEXT,
      role VARCHAR(20) DEFAULT 'broker',
      is_active BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      subscription_end_date TIMESTAMP WITH TIME ZONE,
      username TEXT,
      password_hash TEXT,
      email TEXT,
      phone TEXT,
      is_admin BOOLEAN
    );

    -- Create sender table
    CREATE TABLE IF NOT EXISTS sender (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      first_seen_date TEXT,
      first_seen_time TEXT,
      updated_at TIMESTAMP WITH TIME ZONE,
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

    -- Create messages table (matches Supabase export)
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

  `;
  
  await prismaClient.query(schema);
  console.log('✅ Schema created successfully!');
}

async function createIndexesAndView() {
  const sql = `
    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_sender_mobile ON sender(mobile);
    CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_region_id ON messages(region_id);
    CREATE INDEX IF NOT EXISTS idx_messages_property_type_id ON messages(property_type_id);
    CREATE INDEX IF NOT EXISTS idx_messages_category_id ON messages(category_id);
    CREATE INDEX IF NOT EXISTS idx_messages_purpose_id ON messages(purpose_id);
    CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);

    -- View
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
  `;
  await prismaClient.query(sql);
  console.log('✅ Indexes and view created');
}

async function importData(tableName, data) {
  if (!data || data.length === 0) {
    console.log(`⏭️  Skipping ${tableName} (no data)`);
    return;
  }
  
  console.log(`📥 Importing ${data.length} rows into ${tableName}...`);

  const allowedColumns = await getTableColumns(tableName);
  const columns = Object.keys(data[0]).filter(col => allowedColumns.includes(col));
  if (columns.length === 0) {
    console.log(`⏭️  Skipping ${tableName} (no matching columns found)`);
    return;
  }

  // Bigger chunk size for sender/messages
  const chunkSize = ['sender', 'messages'].includes(tableName) ? 2000 : 500;
  let imported = 0;

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const values = [];
    const rowsPlaceholders = chunk.map((row, rowIdx) => {
      const rowVals = columns.map(col => row[col]);
      values.push(...rowVals);
      const base = rowIdx * columns.length;
      const ph = columns.map((_, colIdx) => `$${base + colIdx + 1}`).join(', ');
      return `(${ph})`;
    }).join(', ');

    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${rowsPlaceholders} ON CONFLICT DO NOTHING`;

    try {
      await prismaClient.query(query, values);
      imported += chunk.length;
    } catch (error) {
      console.error(`Error importing batch to ${tableName}:`, error.message);
    }
  }

  console.log(`✅ Imported ${imported}/${data.length} rows into ${tableName}`);
}

async function migrate() {
  try {
    // Connect to Prisma
    await prismaClient.connect();
    console.log('✅ Connected to Prisma database\n');
    
    // Step 1: Create schema
    await createSchema();
    
    // Step 2: Export and import data
    console.log('\n📦 Migrating data...\n');
    
    const tables = ['users', 'sender', 'regions', 'property_types', 'categories', 'purposes'];
    
    for (const table of tables) {
      const data = await exportTable(table);
      await importData(table, data);
    }
    
    // Messages last (has foreign keys)
    const messages = await exportTable('messages');
    await importData('messages', messages);

    // Create indexes and view after data load for speed
    await createIndexesAndView();
    
    console.log('\n🎉 Migration completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('1. Update Vercel environment variables');
    console.log('2. Git commit and push');
    console.log('3. Verify deployment');
    console.log('\n⚠️  Remember to rotate Prisma credentials!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prismaClient.end();
  }
}

// Run migration
migrate();
