const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase credentials - update these with your actual values
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function exportTable(tableName) {
  console.log(`\n📦 Exporting ${tableName}...`);
  
  let allData = [];
  let from = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .range(from, from + batchSize - 1);
    
    if (error) {
      console.error(`❌ Error exporting ${tableName}:`, error);
      throw error;
    }
    
    if (data && data.length > 0) {
      allData = allData.concat(data);
      console.log(`   Exported ${allData.length} / ${count || '?'} rows...`);
    }
    
    if (!data || data.length < batchSize) break;
    from += batchSize;
  }
  
  console.log(`✅ Exported ${allData.length} rows from ${tableName}`);
  return allData;
}

async function exportAllData() {
  console.log('🚀 Starting Supabase data export...\n');
  
  const exportDir = path.join(__dirname, 'supabase-export');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  
  const tables = [
    'users',
    'sender',
    'regions',
    'property_types',
    'categories',
    'purposes',
    'messages'
  ];
  
  const exportData = {
    exported_at: new Date().toISOString(),
    tables: {}
  };
  
  for (const table of tables) {
    try {
      const data = await exportTable(table);
      exportData.tables[table] = data;
      
      // Save individual table file
      const filePath = path.join(exportDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`   💾 Saved to ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to export ${table}:`, error.message);
    }
  }
  
  // Save complete export
  const fullExportPath = path.join(exportDir, 'full-export.json');
  fs.writeFileSync(fullExportPath, JSON.stringify(exportData, null, 2));
  console.log(`\n✅ Full export saved to ${fullExportPath}`);
  
  // Generate summary
  console.log('\n📊 Export Summary:');
  for (const [table, data] of Object.entries(exportData.tables)) {
    console.log(`   ${table}: ${data.length} rows`);
  }
  
  return exportData;
}

// Run export
exportAllData()
  .then(() => {
    console.log('\n🎉 Export completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  });
