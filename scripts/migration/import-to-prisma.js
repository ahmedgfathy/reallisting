const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Prisma/Contabo database URL
const DATABASE_URL = process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: PRISMA_DATABASE_URL or POSTGRES_URL must be set');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createSchema() {
  console.log('\n🏗️  Creating database schema...');
  
  const schemaSql = `
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
  `;

  await client.query(schemaSql);
  console.log('✅ Schema created successfully');
}

async function importTable(tableName, data) {
  if (!data || data.length === 0) {
    console.log(`   ⚠️  No data to import for ${tableName}`);
    return;
  }

  console.log(`\n📥 Importing ${tableName} (${data.length} rows)...`);

  const columns = Object.keys(data[0]);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const columnNames = columns.join(', ');

  const insertQuery = `
    INSERT INTO ${tableName} (${columnNames})
    VALUES (${placeholders})
    ON CONFLICT DO NOTHING
  `;

  let imported = 0;
  for (const row of data) {
    try {
      const values = columns.map(col => row[col]);
      await client.query(insertQuery, values);
      imported++;
      
      if (imported % 100 === 0) {
        console.log(`   Imported ${imported}/${data.length}...`);
      }
    } catch (error) {
      console.error(`   ⚠️  Error importing row:`, error.message);
    }
  }

  console.log(`✅ Imported ${imported}/${data.length} rows into ${tableName}`);
}

async function importAllData() {
  console.log('🚀 Starting Prisma database import...\n');

  try {
    await client.connect();
    console.log('✅ Connected to Prisma database');

    // Create schema
    await createSchema();

    // Load exported data
    const exportDir = path.join(__dirname, 'supabase-export');
    const fullExportPath = path.join(exportDir, 'full-export.json');

    if (!fs.existsSync(fullExportPath)) {
      throw new Error('Export file not found. Run export-supabase.js first.');
    }

    const exportData = JSON.parse(fs.readFileSync(fullExportPath, 'utf8'));
    console.log(`\n📂 Loaded export from ${exportData.exported_at}`);

    // Import in order (respecting foreign keys)
    const importOrder = [
      'users',
      'sender',
      'regions',
      'property_types',
      'categories',
      'purposes',
      'messages'
    ];

    for (const table of importOrder) {
      if (exportData.tables[table]) {
        await importTable(table, exportData.tables[table]);
      }
    }

    // Generate summary
    console.log('\n📊 Import Summary:');
    for (const table of importOrder) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`   ${table}: ${result.rows[0].count} rows`);
    }

    console.log('\n🎉 Import completed successfully!');

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run import
importAllData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
