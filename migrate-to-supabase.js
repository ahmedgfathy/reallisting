const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration - using your provided credentials
const supabaseUrl = 'https://gxyrpboyubpycejlkxue.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateData() {
  console.log('Starting migration to Supabase...');
  
  // Read messages from exported JSON
  const messagesFile = path.join(__dirname, 'messages_export.json');
  const usersFile = path.join(__dirname, 'users_export.json');
  
  if (!fs.existsSync(messagesFile)) {
    console.error('messages_export.json not found!');
    return;
  }
  
  // Parse messages
  let messages = [];
  try {
    const content = fs.readFileSync(messagesFile, 'utf-8');
    // Remove the column header line and parse
    const jsonStart = content.indexOf('[');
    if (jsonStart >= 0) {
      messages = JSON.parse(content.substring(jsonStart));
    }
    console.log(`Loaded ${messages.length} messages from export file`);
  } catch (err) {
    console.error('Error parsing messages:', err.message);
    return;
  }
  
  // Parse users
  let users = [];
  if (fs.existsSync(usersFile)) {
    try {
      const content = fs.readFileSync(usersFile, 'utf-8');
      const jsonStart = content.indexOf('[');
      if (jsonStart >= 0) {
        users = JSON.parse(content.substring(jsonStart));
      }
      console.log(`Loaded ${users.length} users from export file`);
    } catch (err) {
      console.warn('Warning: Could not parse users:', err.message);
    }
  }
  
  // Migrate users first
  if (users.length > 0) {
    console.log('Migrating users...');
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
            created_at: user.createdAt || new Date().toISOString()
          }, { onConflict: 'mobile' });
        
        if (error) {
          console.error(`Error migrating user ${user.mobile}:`, error.message);
        }
      } catch (err) {
        console.error(`Error migrating user ${user.mobile}:`, err.message);
      }
    }
    console.log('Users migration complete!');
  }
  
  // Migrate messages in batches
  const batchSize = 1000;
  let processed = 0;
  
  console.log(`Migrating ${messages.length} messages in batches of ${batchSize}...`);
  
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    
    // Transform to Supabase schema (snake_case column names)
    const transformed = batch.map(msg => ({
      id: msg.id,
      name: msg.name || '',
      mobile: msg.mobile || 'N/A',
      message: msg.message || '',
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
        console.error(`Error in batch ${i}-${i + batch.length}:`, error.message);
      } else {
        processed += batch.length;
        console.log(`Processed ${processed}/${messages.length} messages...`);
      }
    } catch (err) {
      console.error(`Error in batch ${i}-${i + batch.length}:`, err.message);
    }
  }
  
  console.log(`\nMigration complete! Migrated ${processed} messages.`);
  
  // Verify count
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total messages in Supabase: ${count}`);
}

migrateData().catch(console.error);
