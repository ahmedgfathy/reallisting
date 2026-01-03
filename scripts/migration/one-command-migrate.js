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
    DROP TABLE IF EXISTS messages CASCADE;
    DROP TABLE IF EXISTS purposes CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS property_types CASCADE;
    DROP TABLE IF EXISTS regions CASCADE;
    DROP TABLE IF EXISTS sender CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP VIEW IF EXISTS messages_with_sender CASCADE;

    -- Create users table
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      is_admin BOOLEAN DEFAULT FALSE,
      subscription_end_date TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create sender table
    CREATE TABLE sender (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      mobile VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create regions table
    CREATE TABLE regions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create property_types table
    CREATE TABLE property_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create categories table
    CREATE TABLE categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create purposes table
    CREATE TABLE purposes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create messages table
    CREATE TABLE messages (
      id SERIAL PRIMARY KEY,
      message_text TEXT,
      sender_id INTEGER REFERENCES sender(id) ON DELETE SET NULL,
      region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL,
      property_type_id INTEGER REFERENCES property_types(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      purpose_id INTEGER REFERENCES purposes(id) ON DELETE SET NULL,
      area NUMERIC,
      location VARCHAR(255),
      price NUMERIC,
      mobile_number VARCHAR(50),
      whatsapp_number VARCHAR(50),
      image_url TEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX idx_messages_sender ON messages(sender_id);
    CREATE INDEX idx_messages_region ON messages(region_id);
    CREATE INDEX idx_messages_property_type ON messages(property_type_id);
    CREATE INDEX idx_messages_category ON messages(category_id);
    CREATE INDEX idx_messages_purpose ON messages(purpose_id);
    CREATE INDEX idx_messages_date ON messages(date);

    -- Create view
    CREATE VIEW messages_with_sender AS
    SELECT 
      m.*,
      s.name as sender_name,
      s.mobile as sender_mobile,
      r.name as region_name,
      pt.name as property_type_name,
      c.name as category_name,
      p.name as purpose_name
    FROM messages m
    LEFT JOIN sender s ON m.sender_id = s.id
    LEFT JOIN regions r ON m.region_id = r.id
    LEFT JOIN property_types pt ON m.property_type_id = pt.id
    LEFT JOIN categories c ON m.category_id = c.id
    LEFT JOIN purposes p ON m.purpose_id = p.id;
  `;
  
  await prismaClient.query(schema);
  console.log('✅ Schema created successfully!');
}

async function importData(tableName, data) {
  if (!data || data.length === 0) {
    console.log(`⏭️  Skipping ${tableName} (no data)`);
    return;
  }
  
  console.log(`📥 Importing ${data.length} rows into ${tableName}...`);
  
  const columns = Object.keys(data[0]);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
  
  let imported = 0;
  for (const row of data) {
    try {
      const values = columns.map(col => row[col]);
      await prismaClient.query(query, values);
      imported++;
    } catch (error) {
      console.error(`Error importing row to ${tableName}:`, error.message);
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
