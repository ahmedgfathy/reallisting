#!/usr/bin/env node

/**
 * Complete Data Migration from PostgreSQL to Appwrite
 * Migrates: users, messages, regions
 */

const { Client, Databases, ID } = require('node-appwrite');
const { Client: PgClient } = require('pg');
require('dotenv').config();

// PostgreSQL Configuration
const POSTGRES_URL = process.env.POSTGRES_URL || 
                     process.env.listing_realestates_POSTGRES_URL ||
                     process.env.DATABASE_URL;

// Appwrite Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '694ba83300116af11b75';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = 'reallisting';

// Initialize Appwrite
const appwriteClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(appwriteClient);

// Initialize PostgreSQL
let pgClient = null;
if (POSTGRES_URL) {
  pgClient = new PgClient({
    connectionString: POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });
}

const COLLECTIONS = {
  USERS: 'users',
  MESSAGES: 'messages',
  REGIONS: 'regions'
};

// Statistics
const stats = {
  users: { total: 0, migrated: 0, failed: 0 },
  messages: { total: 0, migrated: 0, failed: 0 },
  regions: { total: 0, migrated: 0, failed: 0 }
};

async function migrateUsers() {
  console.log('\n👥 Migrating Users...');
  
  try {
    const result = await pgClient.query('SELECT * FROM users ORDER BY id');
    stats.users.total = result.rows.length;
    console.log(`   Found ${stats.users.total} users in PostgreSQL`);

    for (const user of result.rows) {
      try {
        // Check if user already exists
        try {
          await databases.getDocument(DATABASE_ID, COLLECTIONS.USERS, user.id.toString());
          console.log(`   ⏭️  User ${user.mobile} already exists, skipping...`);
          stats.users.migrated++;
          continue;
        } catch (e) {
          // User doesn't exist, create it
        }

        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.USERS,
          user.id.toString(),
          {
            mobile: user.mobile || '',
            role: user.role || 'broker',
            isActive: user.is_active !== undefined ? user.is_active : false,
            name: user.name || '',
            createdAt: user.created_at || new Date().toISOString()
          }
        );
        
        stats.users.migrated++;
        console.log(`   ✅ Migrated user: ${user.mobile}`);
      } catch (error) {
        stats.users.failed++;
        console.error(`   ❌ Failed to migrate user ${user.mobile}:`, error.message);
      }
    }

    console.log(`   📊 Users: ${stats.users.migrated}/${stats.users.total} migrated, ${stats.users.failed} failed`);
  } catch (error) {
    console.error('   ❌ Error fetching users from PostgreSQL:', error.message);
  }
}

async function migrateMessages() {
  console.log('\n💬 Migrating Messages...');
  
  try {
    // Try with sender info first, fallback to basic messages
    let result;
    try {
      result = await pgClient.query(`
        SELECT m.*, s.name as sender_name, s.mobile as sender_mobile 
        FROM messages m 
        LEFT JOIN sender s ON m.sender_id = s.id 
        ORDER BY m.id 
        LIMIT 10000
      `);
    } catch (e) {
      console.log('   ℹ️  Falling back to basic messages table');
      result = await pgClient.query('SELECT * FROM messages ORDER BY id LIMIT 10000');
    }

    stats.messages.total = result.rows.length;
    console.log(`   Found ${stats.messages.total} messages in PostgreSQL`);

    let batchCount = 0;
    for (const msg of result.rows) {
      try {
        // Check if message already exists
        try {
          await databases.getDocument(DATABASE_ID, COLLECTIONS.MESSAGES, msg.id.toString());
          stats.messages.migrated++;
          batchCount++;
          if (batchCount % 100 === 0) {
            console.log(`   📦 Processed ${batchCount}/${stats.messages.total} messages...`);
          }
          continue;
        } catch (e) {
          // Message doesn't exist, create it
        }

        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.MESSAGES,
          msg.id.toString(),
          {
            message: msg.message || '',
            category: msg.category || 'أخرى',
            propertyType: msg.property_type || 'أخرى',
            region: msg.region || 'أخرى',
            purpose: msg.purpose || 'أخرى',
            sourceFile: msg.source_file || '',
            imageUrl: msg.image_url || '',
            senderName: msg.sender_name || '',
            senderMobile: msg.sender_mobile || '',
            dateOfCreation: msg.date_of_creation || msg.created_at || new Date().toISOString(),
            createdAt: msg.created_at || new Date().toISOString()
          }
        );
        
        stats.messages.migrated++;
        batchCount++;
        
        if (batchCount % 100 === 0) {
          console.log(`   ✅ Migrated ${batchCount}/${stats.messages.total} messages...`);
        }
      } catch (error) {
        stats.messages.failed++;
        if (stats.messages.failed < 10) {
          console.error(`   ❌ Failed to migrate message ${msg.id}:`, error.message);
        }
      }
    }

    console.log(`   📊 Messages: ${stats.messages.migrated}/${stats.messages.total} migrated, ${stats.messages.failed} failed`);
  } catch (error) {
    console.error('   ❌ Error fetching messages from PostgreSQL:', error.message);
  }
}

async function migrateRegions() {
  console.log('\n🗺️  Migrating Regions...');
  
  try {
    // Count messages by region
    const result = await pgClient.query(`
      SELECT region, COUNT(*) as count 
      FROM messages 
      WHERE region IS NOT NULL AND region != '' 
      GROUP BY region 
      ORDER BY count DESC
    `);
    
    stats.regions.total = result.rows.length;
    console.log(`   Found ${stats.regions.total} regions in PostgreSQL`);

    for (const region of result.rows) {
      try {
        // Create unique ID from region name
        const regionId = region.region.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        
        // Check if region already exists
        try {
          await databases.getDocument(DATABASE_ID, COLLECTIONS.REGIONS, regionId);
          stats.regions.migrated++;
          continue;
        } catch (e) {
          // Region doesn't exist, create it
        }

        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.REGIONS,
          regionId,
          {
            name: region.region,
            nameAr: region.region,
            count: parseInt(region.count) || 0
          }
        );
        
        stats.regions.migrated++;
        console.log(`   ✅ Migrated region: ${region.region} (${region.count} listings)`);
      } catch (error) {
        stats.regions.failed++;
        console.error(`   ❌ Failed to migrate region ${region.region}:`, error.message);
      }
    }

    console.log(`   📊 Regions: ${stats.regions.migrated}/${stats.regions.total} migrated, ${stats.regions.failed} failed`);
  } catch (error) {
    console.error('   ❌ Error fetching regions from PostgreSQL:', error.message);
  }
}

async function migrate() {
  console.log('========================================');
  console.log('  PostgreSQL → Appwrite Migration');
  console.log('========================================\n');

  // Validate configuration
  if (!APPWRITE_API_KEY) {
    console.error('❌ Error: APPWRITE_API_KEY not found in environment');
    process.exit(1);
  }

  if (!POSTGRES_URL) {
    console.error('❌ Error: PostgreSQL connection string not found');
    console.error('   Set one of: POSTGRES_URL, DATABASE_URL, listing_realestates_POSTGRES_URL');
    process.exit(1);
  }

  console.log('✅ Configuration validated');
  console.log(`   PostgreSQL: ${POSTGRES_URL.substring(0, 30)}...`);
  console.log(`   Appwrite Project: ${APPWRITE_PROJECT_ID}`);
  console.log(`   Appwrite Endpoint: ${APPWRITE_ENDPOINT}`);

  // Connect to PostgreSQL
  try {
    console.log('\n📡 Connecting to PostgreSQL...');
    await pgClient.connect();
    console.log('✅ Connected to PostgreSQL');
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error.message);
    process.exit(1);
  }

  // Start migration
  const startTime = Date.now();

  await migrateUsers();
  await migrateMessages();
  await migrateRegions();

  // Close PostgreSQL connection
  await pgClient.end();

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n========================================');
  console.log('  Migration Complete!');
  console.log('========================================\n');
  console.log('📊 Summary:');
  console.log(`   Users:    ${stats.users.migrated}/${stats.users.total} (${stats.users.failed} failed)`);
  console.log(`   Messages: ${stats.messages.migrated}/${stats.messages.total} (${stats.messages.failed} failed)`);
  console.log(`   Regions:  ${stats.regions.migrated}/${stats.regions.total} (${stats.regions.failed} failed)`);
  console.log(`\n⏱️  Duration: ${duration} seconds`);
  console.log('\n✨ Your data is now in Appwrite!');
  console.log(`\n🔗 View in console: https://cloud.appwrite.io/console/project-${APPWRITE_PROJECT_ID}/databases/database-${DATABASE_ID}`);
}

migrate().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
