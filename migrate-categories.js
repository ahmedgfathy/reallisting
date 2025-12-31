const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const supabase = createClient(
  'https://gxyrpboyubpycejlkxue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk'
);

async function migratePropertyCategories() {
  console.log('📦 Migrating property_categories...\n');
  
  try {
    const cmd = `sshpass -p 'ZeroCall20!@HH##1655&&' ssh -o StrictHostKeyChecking=no root@app.glomartrealestates.com 'mysql -u root -p"ZeroCall20!@HH##1655&&" glomart_data -e "SELECT * FROM property_categories" --batch --raw'`;
    
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    
    const lines = stdout.trim().split('\n');
    if (lines.length <= 1) {
      console.log('No data found');
      return;
    }
    
    const headers = lines[0].split('\t');
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t');
      const row = {};
      
      headers.forEach((header, index) => {
        const value = values[index];
        row[header] = (value === 'NULL' || value === '\\N' || value === '') ? null : value;
      });
      
      rows.push(row);
    }
    
    console.log(`Found ${rows.length} categories:`, rows.map(r => r.name));
    
    const { data, error } = await supabase
      .from('glomar_property_categories')
      .insert(rows);
    
    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log(`✅ Successfully migrated ${rows.length} property categories`);
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  }
}

migratePropertyCategories();
