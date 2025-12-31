const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;

const execAsync = promisify(exec);

const supabase = createClient(
  'https://gxyrpboyubpycejlkxue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk'
);

async function dumpTableViaSSH(tableName) {
  console.log(`📥 Dumping ${tableName} via SSH...`);
  
  // Use JSON output to avoid tab/newline parsing issues
  const cmd = `sshpass -p 'ZeroCall20!@HH##1655&&' ssh -o StrictHostKeyChecking=no root@app.glomartrealestates.com "mysql -u root -p'ZeroCall20!@HH##1655&&' glomart_data -e 'SELECT * FROM ${tableName}' --batch | python3 -c \\"import sys, json, csv; reader = csv.DictReader(sys.stdin, delimiter='\\\\t'); print(json.dumps([dict(row) for row in reader], ensure_ascii=False))\\""`;
  
  try {
    const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 100 * 1024 * 1024 });
    
    if (stderr && !stderr.includes('Warning') && !stderr.includes('mysql: [Warning]')) {
      console.error(`Error dumping ${tableName}:`, stderr);
      return [];
    }
    
    // Parse JSON output
    const rows = JSON.parse(stdout);
    
    // Handle NULL values
    const cleanedRows = rows.map(row => {
      const cleanRow = {};
      for (const [key, value] of Object.entries(row)) {
        cleanRow[key] = (value === 'NULL' || value === '\\N' || value === '') ? null : value;
      }
      return cleanRow;
    });
    
    console.log(`✅ Dumped ${cleanedRows.length} rows from ${tableName}`);
    return cleanedRows;
    
  } catch (error) {
    console.error(`❌ Error dumping ${tableName}:`, error.message);
    return [];
  }
}

async function migrateGlomarData() {
  console.log('🚀 Starting glomart_data migration via SSH dump...\n');
  
  try {
    // Reference tables to migrate (in order)
    const referenceTables = [
      { name: 'countries', table: 'glomar_countries' },
      { name: 'currencies', table: 'glomar_currencies' },
      { name: 'regions', table: 'glomar_regions' },
      { name: 'property_types', table: 'glomar_property_types' },
      { name: 'property_categories', table: 'glomar_property_categories' },
      { name: 'property_purposes', table: 'glomar_property_purposes' },
      { name: 'property_statuses', table: 'glomar_property_statuses' },
      { name: 'finishing_levels', table: 'glomar_finishing_levels' },
      { name: 'unit_facilities', table: 'glomar_unit_facilities' },
      { name: 'filtersettings', table: 'glomar_filtersettings' }
    ];
    
    // Step 1: Migrate all reference tables
    console.log('📚 Step 1: Migrating reference/lookup tables...\n');
    for (const ref of referenceTables) {
      console.log(`  📥 Migrating ${ref.name}...`);
      const rows = await dumpTableViaSSH(ref.name);
      
      if (rows.length > 0) {
        const { data, error } = await supabase
          .from(ref.table)
          .insert(rows);
        
        if (error) {
          console.error(`  ❌ Error: ${error.message}`);
        } else {
          console.log(`  ✅ ${rows.length} rows migrated`);
        }
      } else {
        console.log(`  ⚠️  No data found`);
      }
    }
    console.log('\n✅ Reference tables migration complete\n');
    
    // Step 2: Migrate Properties (master table)
    console.log('🏠 Step 2: Migrating properties...');
    const properties = await dumpTableViaSSH('properties');
    
    if (properties.length > 0) {
      // Remove duplicates from the source data first
      const uniqueProps = {};
      for (const prop of properties) {
        if (!uniqueProps[prop.id]) {
          uniqueProps[prop.id] = prop;
        }
      }
      const cleanedProperties = Object.values(uniqueProps);
      console.log(`Removed ${properties.length - cleanedProperties.length} duplicates from source data`);
      
      for (let i = 0; i < cleanedProperties.length; i += 100) {
        const batch = cleanedProperties.slice(i, i + 100);
        
        const { data, error } = await supabase
          .from('glomar_properties')
          .insert(batch)
          .select();
        
        if (error) {
          console.error(`Error in batch ${i}-${i + batch.length}:`, error.message);
        } else {
          if ((i + 100) % 500 === 0 || i + 100 >= cleanedProperties.length) {
            console.log(`✅ Migrated ${Math.min(i + 100, cleanedProperties.length)}/${cleanedProperties.length} properties`);
          }
        }
      }
    }
    console.log(`✅ Properties migration complete (${properties.length} total)\n`);
    
    // Step 3: Migrate Property Images
    console.log('🖼️  Step 3: Migrating property images...');
    const propImages = await dumpTableViaSSH('properties_images');
    
    if (propImages.length > 0) {
      for (let i = 0; i < propImages.length; i += 100) {
        const batch = propImages.slice(i, i + 100);
        
        const { data, error } = await supabase
          .from('glomar_properties_images')
          .insert(batch);
        
        if (error) {
          console.error(`Error in images batch ${i}-${i + batch.length}:`, error.message);
        } else {
          if ((i + 100) % 500 === 0 || i + 100 >= propImages.length) {
            console.log(`✅ Migrated ${Math.min(i + 100, propImages.length)}/${propImages.length} images`);
          }
        }
      }
    }
    console.log(`✅ Property images migration complete (${propImages.length} total)\n`);
    
    // Step 4: Migrate Property Videos
    console.log('🎥 Step 4: Migrating property videos...');
    const propVideos = await dumpTableViaSSH('properties_videos');
    
    if (propVideos.length > 0) {
      for (let i = 0; i < propVideos.length; i += 100) {
        const batch = propVideos.slice(i, i + 100);
        
        const { data, error } = await supabase
          .from('glomar_properties_videos')
          .insert(batch);
        
        if (error) {
          console.error(`Error in videos batch ${i}-${i + batch.length}:`, error.message);
        } else {
          if ((i + 100) % 500 === 0 || i + 100 >= propVideos.length) {
            console.log(`✅ Migrated ${Math.min(i + 100, propVideos.length)}/${propVideos.length} videos`);
          }
        }
      }
    }
    console.log(`✅ Property videos migration complete (${propVideos.length} total)\n`);
    
    console.log('🎉 Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`✅ Properties: ${properties.length}`);
    console.log(`✅ Images: ${propImages.length}`);
    console.log(`✅ Videos: ${propVideos.length}`);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

// Run migration
migrateGlomarData().catch(console.error);
