const sqlite = require('../lib/sqlite');
const mariadb = require('../lib/mariadb');

async function migrate() {
  console.log('🚀 Starting migration from SQLite to MariaDB...\n');

  try {
    // Initialize MariaDB tables
    await mariadb.initDatabase();
    
    // Helper to format dates for MySQL
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      if (isNaN(date.getTime()) || date.getFullYear() > 2025) return null;
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };

    // Migrate Users
    console.log('📦 Migrating users...');
    const users = await sqlite.users.getAll();
    for (const user of users) {
      try {
        await mariadb.pool.query(
          `INSERT INTO users (id, mobile, password, name, role, is_active, subscription_end_date, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
           ON DUPLICATE KEY UPDATE mobile=mobile`,
          [
            user.id,
            user.mobile,
            user.password,
            user.name || '',
            user.role || 'broker',
            user.is_active || 0,
            formatDate(user.subscription_end_date),
            formatDate(user.created_at) || formatDate(new Date().toISOString())
          ]
        );
      } catch (err) {
        console.error(`  ❌ Failed to migrate user ${user.mobile}:`, err.message);
      }
    }
    console.log(`  ✅ Migrated ${users.length} users\n`);

    // Migrate Messages (in batches)
    console.log('📦 Migrating messages...');
    let page = 1;
    let totalMessages = 0;
    const batchSize = 1000;

    while (true) {
      const result = await sqlite.messages.get({ page, limit: batchSize });
      
      if (result.data.length === 0) break;

      for (const msg of result.data) {
        try {
          // Convert ISO date strings to MySQL datetime format
          const formatDate = (dateStr) => {
            if (!dateStr) return null;
            const date = new Date(dateStr);
            if (isNaN(date.getTime()) || date.getFullYear() > 2025) return null;
            return date.toISOString().slice(0, 19).replace('T', ' ');
          };

          await mariadb.pool.query(
            `INSERT INTO messages (id, message, sender_name, sender_mobile, date_of_creation, source_file, image_url, category, property_type, region, purpose, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE id=id`,
            [
              msg.id,
              msg.message || '',
              msg.sender_name || '',
              msg.sender_mobile || '',
              formatDate(msg.date_of_creation),
              msg.source_file || '',
              msg.image_url || '',
              msg.category || 'أخرى',
              msg.property_type || 'أخرى',
              msg.region || 'أخرى',
              msg.purpose || 'أخرى',
              formatDate(msg.created_at) || formatDate(new Date().toISOString())
            ]
          );
          totalMessages++;
        } catch (err) {
          console.error(`  ❌ Failed to migrate message ${msg.id}:`, err.message);
        }
      }

      console.log(`  Migrated ${totalMessages} messages so far...`);
      
      if (result.data.length < batchSize) break;
      page++;
    }
    console.log(`  ✅ Migrated ${totalMessages} messages\n`);

    // Migrate Regions
    console.log('📦 Migrating regions...');
    const regionsData = await sqlite.regions.getAll();
    for (const region of regionsData) {
      try {
        await mariadb.pool.query(
          `INSERT INTO regions (id, name, created_at) 
           VALUES (?, ?, ?) 
           ON DUPLICATE KEY UPDATE name=name`,
          [
            region.id,
            region.name,
            formatDate(region.created_at) || formatDate(new Date().toISOString())
          ]
        );
      } catch (err) {
        console.error(`  ❌ Failed to migrate region ${region.name}:`, err.message);
      }
    }
    console.log(`  ✅ Migrated ${regionsData.length} regions\n`);

    // Verify migration
    console.log('🔍 Verifying migration...');
    const [userCount] = await mariadb.pool.query('SELECT COUNT(*) as count FROM users');
    const [messageCount] = await mariadb.pool.query('SELECT COUNT(*) as count FROM messages');
    const [regionCount] = await mariadb.pool.query('SELECT COUNT(*) as count FROM regions');

    console.log(`\n✅ Migration complete!`);
    console.log(`   Users: ${userCount[0].count}`);
    console.log(`   Messages: ${messageCount[0].count}`);
    console.log(`   Regions: ${regionCount[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
