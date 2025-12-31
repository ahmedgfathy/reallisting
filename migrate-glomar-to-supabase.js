const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');

const supabase = createClient(
  'https://gxyrpboyubpycejlkxue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk'
);

// Remote MySQL connection
const mysqlConfig = {
  host: 'app.glomartrealestates.com',
  user: 'root',
  password: 'ZeroCall20!@HH##1655&&',
  database: 'glomart_data'
};

async function migrateGlomarData() {
  console.log('🚀 Starting glomart_data migration...\n');
  
  const connection = await mysql.createConnection(mysqlConfig);
  
  try {
    // Step 1: Migrate Projects
    console.log('📦 Step 1: Migrating projects...');
    const [projects] = await connection.execute('SELECT * FROM projects');
    console.log(`Found ${projects.length} projects`);
    
    if (projects.length > 0) {
      for (let i = 0; i < projects.length; i += 50) {
        const batch = projects.slice(i, i + 50);
        const { error } = await supabase.from('glomar_projects').upsert(batch);
        if (error) console.error('Projects error:', error);
        else console.log(`  Migrated projects ${i + 1}-${Math.min(i + 50, projects.length)}`);
      }
    }
    
    // Step 2: Migrate Properties
    console.log('\n🏠 Step 2: Migrating properties...');
    const [properties] = await connection.execute('SELECT * FROM properties');
    console.log(`Found ${properties.length} properties`);
    
    let migratedCount = 0;
    for (let i = 0; i < properties.length; i += 100) {
      const batch = properties.slice(i, i + 100);
      const { error } = await supabase.from('glomar_properties').upsert(batch);
      if (error) {
        console.error(`Error at batch ${i}:`, error.message);
      } else {
        migratedCount += batch.length;
        console.log(`  Migrated ${migratedCount}/${properties.length} properties`);
      }
    }
    
    // Step 3: Get property IDs and create image/video records
    console.log('\n📸 Step 3: Processing images and videos...');
    
    const [propsWithMedia] = await connection.execute(`
      SELECT id, propertyimage, images, videos 
      FROM properties 
      WHERE propertyimage IS NOT NULL OR images IS NOT NULL OR videos IS NOT NULL
    `);
    
    console.log(`Found ${propsWithMedia.length} properties with media`);
    
    let imageCount = 0;
    let videoCount = 0;
    
    for (const prop of propsWithMedia) {
      // Process images
      const imageUrls = [];
      if (prop.propertyimage) imageUrls.push(prop.propertyimage);
      if (prop.images) {
        try {
          const parsed = JSON.parse(prop.images);
          if (Array.isArray(parsed)) imageUrls.push(...parsed);
        } catch {
          // If not JSON, treat as comma-separated
          imageUrls.push(...prop.images.split(',').map(s => s.trim()));
        }
      }
      
      // Insert images
      for (let idx = 0; idx < imageUrls.length; idx++) {
        const url = imageUrls[idx];
        if (!url) continue;
        
        const imageRecord = {
          id: `${prop.id}-img-${idx}`,
          property_id: prop.id,
          name: `Image ${idx + 1}`,
          image_url: url.startsWith('http') ? url : `https://app.glomartrealestates.com${url}`,
          created_at: new Date().toISOString()
        };
        
        await supabase.from('glomar_property_images').upsert([imageRecord]);
        imageCount++;
      }
      
      // Process videos
      if (prop.videos) {
        try {
          const videoUrls = JSON.parse(prop.videos);
          if (Array.isArray(videoUrls)) {
            for (let idx = 0; idx < videoUrls.length; idx++) {
              const url = videoUrls[idx];
              if (!url) continue;
              
              const videoRecord = {
                id: `${prop.id}-vid-${idx}`,
                property_id: prop.id,
                name: `Video ${idx + 1}`,
                video_url: url.startsWith('http') ? url : `https://app.glomartrealestates.com${url}`,
                created_at: new Date().toISOString()
              };
              
              await supabase.from('glomar_property_videos').upsert([videoRecord]);
              videoCount++;
            }
          }
        } catch (e) {
          // Skip invalid video JSON
        }
      }
      
      if ((propsWithMedia.indexOf(prop) + 1) % 100 === 0) {
        console.log(`  Processed ${propsWithMedia.indexOf(prop) + 1}/${propsWithMedia.length} properties`);
      }
    }
    
    console.log(`\n✅ Migration completed!`);
    console.log(`  Projects: ${projects.length}`);
    console.log(`  Properties: ${migratedCount}`);
    console.log(`  Images: ${imageCount}`);
    console.log(`  Videos: ${videoCount}`);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await connection.end();
  }
}

migrateGlomarData().catch(console.error);
