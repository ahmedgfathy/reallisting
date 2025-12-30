const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');

// Supabase configuration
const supabaseUrl = 'https://gxyrpboyubpycejlkxue.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk';

const supabase = createClient(supabaseUrl, supabaseKey);

// MariaDB configuration
const dbConfig = {
  host: 'localhost',
  user: 'reallisting',
  password: 'reallisting123',
  database: 'reallisting',
  charset: 'utf8mb4'
};

async function migrateData() {
  console.log('Starting direct migration from MariaDB to Supabase...');
  
  // Connect to MariaDB
  const db = await mysql.createConnection(dbConfig);
  console.log('Connected to MariaDB');
  
  // Migrate users first
  console.log('Migrating users...');
  const [users] = await db.execute('SELECT * FROM users');
  console.log(`Found ${users.length} users`);
  
  for (const user of users) {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          mobile: user.mobile,
          password: user.password,
          role: user.role || 'broker',
          is_active: Boolean(user.isActive),
          created_at: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString()
        }, { onConflict: 'mobile' });
      
      if (error) {
        console.error(`Error migrating user ${user.mobile}:`, error.message);
      }
    } catch (err) {
      console.error(`Error migrating user ${user.mobile}:`, err.message);
    }
  }
  console.log('Users migration complete!');
  
  // Get total message count
  const [[{ total }]] = await db.execute('SELECT COUNT(*) as total FROM messages');
  console.log(`Total messages to migrate: ${total}`);
  
  // Migrate messages in batches
  const batchSize = 500;
  let processed = 0;
  
  for (let offset = 0; offset < total; offset += batchSize) {
    const [messages] = await db.execute(
      `SELECT * FROM messages LIMIT ${batchSize} OFFSET ${offset}`
    );
    
    // Transform to Supabase schema
    const transformed = messages.map(msg => ({
      id: msg.id,
      name: (msg.name || '').replace(/[\x00-\x1F\x7F]/g, ' '),
      mobile: msg.mobile || 'N/A',
      message: (msg.message || '').replace(/[\x00-\x1F\x7F]/g, ' '),
      date_of_creation: msg.dateOfCreation || '',
      source_file: msg.sourceFile || '',
      category: msg.category || 'أخرى',
      property_type: msg.propertyType || 'أخرى',
      region: msg.region || 'أخرى',
      purpose: msg.purpose || 'أخرى'
    }));
    
    try {
      const { error } = await supabase
        .from('messages')
        .upsert(transformed, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error in batch ${offset}-${offset + messages.length}:`, error.message);
      } else {
        processed += messages.length;
        console.log(`Processed ${processed}/${total} messages...`);
      }
    } catch (err) {
      console.error(`Error in batch ${offset}-${offset + messages.length}:`, err.message);
    }
  }
  
  console.log(`\nMigration complete! Migrated ${processed} messages.`);
  
  // Verify count
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total messages in Supabase: ${count}`);
  
  await db.end();
}

migrateData().catch(console.error);
