const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');
const { createTunnel } = require('tunnel-ssh');

const supabase = createClient(
  'https://gxyrpboyubpycejlkxue.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk'
);

// SSH Tunnel configuration
const tunnelConfig = {
  autoClose: true
};

const sshOptions = {
  host: 'app.glomartrealestates.com',
  port: 22,
  username: 'root',
  password: 'ZeroCall20!@HH##1655&&'
};

const serverOptions = {
  port: 3306 // MySQL port on remote server
};

const forwardOptions = {
  srcAddr: '127.0.0.1',
  srcPort: 3307, // Local port to use
  dstAddr: '127.0.0.1',
  dstPort: 3306
};

async function migrateGlomarData() {
  console.log('🚀 Starting glomart_data migration with SSH tunnel...\n');
  
  let tunnel;
  let connection;
  
  try {
    // Create SSH tunnel
    console.log('🔐 Creating SSH tunnel...');
    [tunnel] = await createTunnel(tunnelConfig, serverOptions, sshOptions, forwardOptions);
    console.log('✅ SSH tunnel established\n');
    
    // Connect to MySQL through tunnel
    connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: 'root',
      password: 'ZeroCall20!@HH##1655&&',
      database: 'glomart_data'
    });
    console.log('✅ MySQL connected through tunnel\n');
    
    // Step 1: Migrate Projects
    console.log('📦 Step 1: Migrating projects...');
    const [projects] = await connection.execute('SELECT * FROM projects');
    console.log(`Found ${projects.length} projects`);
    
    if (projects.length > 0) {
      for (let i = 0; i < projects.length; i += 50) {
        const batch = projects.slice(i, i + 50);
        
        const { data, error } = await supabase
          .from('glomar_projects')
          .upsert(batch, { onConflict: 'id' });
        
        if (error) {
          console.error(`Error in batch ${i}-${i + batch.length}:`, error);
        } else {
          console.log(`✅ Migrated projects ${i + 1}-${Math.min(i + 50, projects.length)}`);
        }
      }
    }
    console.log('✅ Projects migration complete\n');
    
    // Step 2: Migrate Properties
    console.log('🏠 Step 2: Migrating properties...');
    const [properties] = await connection.execute('SELECT * FROM properties');
    console.log(`Found ${properties.length} properties`);
    
    let migratedCount = 0;
    if (properties.length > 0) {
      for (let i = 0; i < properties.length; i += 100) {
        const batch = properties.slice(i, i + 100);
        
        const { data, error } = await supabase
          .from('glomar_properties')
          .upsert(batch, { onConflict: 'id' });
        
        if (error) {
          console.error(`Error in batch ${i}-${i + batch.length}:`, error);
        } else {
          migratedCount += batch.length;
          if ((i + 100) % 500 === 0 || i + 100 >= properties.length) {
            console.log(`✅ Migrated ${migratedCount}/${properties.length} properties`);
          }
        }
      }
    }
    console.log('✅ Properties migration complete\n');
    
    // Step 3: Migrate Property Images
    console.log('🖼️  Step 3: Migrating property images...');
    const [propImages] = await connection.execute('SELECT * FROM properties_images');
    console.log(`Found ${propImages.length} property images`);
    
    if (propImages.length > 0) {
      const imageRecords = [];
      
      for (const img of propImages) {
        // Create image URL from bucket_id and file_id
        const imageUrl = img.file_id 
          ? `https://app.glomartrealestates.com/v1/storage/buckets/${img.bucket_id}/files/${img.file_id}/view`
          : null;
        
        imageRecords.push({
          id: img.$id,
          property_id: img.property,
          name: img.name || null,
          bucket_id: img.bucket_id || null,
          file_id: img.file_id || null,
          image_url: imageUrl,
          size_bytes: img.size_bytes || null,
          mime_type: img.mime_type || null,
          created_at: img.$createdAt || new Date().toISOString(),
          updated_at: img.$updatedAt || new Date().toISOString()
        });
      }
      
      // Insert images in batches
      for (let i = 0; i < imageRecords.length; i += 100) {
        const batch = imageRecords.slice(i, i + 100);
        
        const { data, error } = await supabase
          .from('glomar_property_images')
          .upsert(batch, { onConflict: 'id' });
        
        if (error) {
          console.error(`Error in images batch ${i}-${i + batch.length}:`, error);
        } else {
          if ((i + 100) % 500 === 0 || i + 100 >= imageRecords.length) {
            console.log(`✅ Migrated ${Math.min(i + 100, imageRecords.length)}/${imageRecords.length} images`);
          }
        }
      }
    }
    console.log('✅ Property images migration complete\n');
    
    // Step 4: Migrate Property Videos
    console.log('🎥 Step 4: Migrating property videos...');
    const [propVideos] = await connection.execute('SELECT * FROM properties_videos');
    console.log(`Found ${propVideos.length} property videos`);
    
    if (propVideos.length > 0) {
      const videoRecords = [];
      
      for (const vid of propVideos) {
        // Create video URL from bucket_id and file_id
        const videoUrl = vid.file_id 
          ? `https://app.glomartrealestates.com/v1/storage/buckets/${vid.bucket_id}/files/${vid.file_id}/view`
          : null;
        
        videoRecords.push({
          id: vid.$id,
          property_id: vid.property,
          name: vid.name || null,
          bucket_id: vid.bucket_id || null,
          file_id: vid.file_id || null,
          video_url: videoUrl,
          size_bytes: vid.size_bytes || null,
          mime_type: vid.mime_type || null,
          created_at: vid.$createdAt || new Date().toISOString(),
          updated_at: vid.$updatedAt || new Date().toISOString()
        });
      }
      
      // Insert videos in batches
      for (let i = 0; i < videoRecords.length; i += 100) {
        const batch = videoRecords.slice(i, i + 100);
        
        const { data, error } = await supabase
          .from('glomar_property_videos')
          .upsert(batch, { onConflict: 'id' });
        
        if (error) {
          console.error(`Error in videos batch ${i}-${i + batch.length}:`, error);
        } else {
          if ((i + 100) % 500 === 0 || i + 100 >= videoRecords.length) {
            console.log(`✅ Migrated ${Math.min(i + 100, videoRecords.length)}/${videoRecords.length} videos`);
          }
        }
      }
    }
    console.log('✅ Property videos migration complete\n');
    
    console.log('🎉 Migration completed successfully!');
    console.log('\nSummary:');
    console.log(`- Projects: ${projects.length}`);
    console.log(`- Properties: ${properties.length}`);
    console.log(`- Images: ${propImages.length}`);
    console.log(`- Videos: ${propVideos.length}`);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    // Clean up
    if (connection) {
      await connection.end();
      console.log('\n🔌 MySQL connection closed');
    }
    if (tunnel) {
      tunnel.close();
      console.log('🔒 SSH tunnel closed');
    }
  }
}

// Run migration
migrateGlomarData().catch(console.error);
