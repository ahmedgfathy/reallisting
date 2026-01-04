#!/usr/bin/env node

/**
 * Complete Automated Setup and Migration
 * This script will create collections and migrate data in one go
 */

const { Client, Databases, ID, Permission, Role } = require('node-appwrite');
const { Client: PgClient } = require('pg');
require('dotenv').config();

// Configuration
const ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '694ba83300116af11b75';
const DATABASE_ID = '695a84140031c5a93745';
const API_KEY = process.env.APPWRITE_API_KEY;
const POSTGRES_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;

console.log('========================================');
console.log('  Complete Appwrite Setup & Migration');
console.log('========================================\n');

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

const collections = {
  users: {
    id: 'users',
    name: 'Users',
    attributes: [
      { key: 'mobile', type: 'string', size: 20, required: true },
      { key: 'role', type: 'string', size: 20, required: true },
      { key: 'isActive', type: 'boolean', required: true },
      { key: 'name', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'datetime', required: false }
    ]
  },
  messages: {
    id: 'messages',
    name: 'Messages',
    attributes: [
      { key: 'message', type: 'string', size: 10000, required: true },
      { key: 'category', type: 'string', size: 50, required: false },
      { key: 'propertyType', type: 'string', size: 50, required: false },
      { key: 'region', type: 'string', size: 100, required: false },
      { key: 'purpose', type: 'string', size: 50, required: false },
      { key: 'sourceFile', type: 'string', size: 100, required: false },
      { key: 'imageUrl', type: 'string', size: 500, required: false },
      { key: 'senderName', type: 'string', size: 100, required: false },
      { key: 'senderMobile', type: 'string', size: 20, required: false },
      { key: 'dateOfCreation', type: 'datetime', required: false },
      { key: 'createdAt', type: 'datetime', required: false }
    ]
  },
  regions: {
    id: 'regions',
    name: 'Regions',
    attributes: [
      { key: 'name', type: 'string', size: 100, required: true },
      { key: 'nameAr', type: 'string', size: 100, required: false },
      { key: 'count', type: 'integer', required: false }
    ]
  }
};

async function createCollections() {
  console.log('📦 Setting up collections...\n');

  for (const [key, config] of Object.entries(collections)) {
    try {
      // Check if collection exists
      try {
        await databases.getCollection(DATABASE_ID, config.id);
        console.log(`✅ Collection "${config.id}" already exists\n`);
        continue;
      } catch (e) {
        // Collection doesn't exist, create it
      }

      console.log(`📝 Creating collection: ${config.name}`);
      
      await databases.createCollection(
        DATABASE_ID,
        config.id,
        config.name,
        [
          Permission.read(Role.any()),
          Permission.create(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ],
        false
      );

      console.log(`   ✅ Collection created: ${config.id}`);

      // Wait a bit for collection to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create attributes
      console.log(`   📋 Creating attributes...`);
      for (const attr of config.attributes) {
        try {
          if (attr.type === 'string') {
            await databases.createStringAttribute(
              DATABASE_ID,
              config.id,
              attr.key,
              attr.size,
              attr.required
            );
          } else if (attr.type === 'boolean') {
            await databases.createBooleanAttribute(
              DATABASE_ID,
              config.id,
              attr.key,
              attr.required
            );
          } else if (attr.type === 'datetime') {
            await databases.createDatetimeAttribute(
              DATABASE_ID,
              config.id,
              attr.key,
              attr.required
            );
          } else if (attr.type === 'integer') {
            await databases.createIntegerAttribute(
              DATABASE_ID,
              config.id,
              attr.key,
              attr.required
            );
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          if (error.code !== 409) {
            console.log(`   ⚠️  Attribute ${attr.key}: ${error.message}`);
          }
        }
      }

      console.log(`   ✅ Attributes created for ${config.id}\n`);

    } catch (error) {
      console.error(`   ❌ Error with ${config.id}:`, error.message, '\n');
    }
  }
}

async function migrateData() {
  console.log('\n📊 Starting data migration...\n');

  const pgClient = new PgClient({
    connectionString: POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pgClient.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Migrate Users
    console.log('👥 Migrating users...');
    const usersResult = await pgClient.query('SELECT * FROM users');
    let userCount = 0;
    for (const user of usersResult.rows) {
      try {
        await databases.createDocument(
          DATABASE_ID,
          'users',
          user.id.toString(),
          {
            mobile: user.mobile || '',
            role: user.role || 'broker',
            isActive: user.is_active || false,
            name: user.name || '',
            createdAt: user.created_at || new Date().toISOString()
          }
        );
        userCount++;
      } catch (e) {
        if (e.code !== 409) console.log(`   ⚠️  User ${user.mobile}: ${e.message}`);
      }
    }
    console.log(`✅ Migrated ${userCount}/${usersResult.rows.length} users\n`);

    // Migrate Messages (in batches)
    console.log('💬 Migrating messages...');
    const messagesResult = await pgClient.query('SELECT * FROM messages LIMIT 10000');
    let msgCount = 0;
    for (const msg of messagesResult.rows) {
      try {
        await databases.createDocument(
          DATABASE_ID,
          'messages',
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
            dateOfCreation: msg.date_of_creation || new Date().toISOString(),
            createdAt: msg.created_at || new Date().toISOString()
          }
        );
        msgCount++;
        if (msgCount % 100 === 0) {
          console.log(`   📦 Migrated ${msgCount} messages...`);
        }
      } catch (e) {
        if (e.code !== 409 && msgCount < 5) {
          console.log(`   ⚠️  Message: ${e.message}`);
        }
      }
    }
    console.log(`✅ Migrated ${msgCount}/${messagesResult.rows.length} messages\n`);

    // Migrate Regions
    console.log('🗺️  Migrating regions...');
    const regionsResult = await pgClient.query(`
      SELECT region, COUNT(*) as count 
      FROM messages 
      WHERE region IS NOT NULL 
      GROUP BY region
    `);
    let regionCount = 0;
    for (const region of regionsResult.rows) {
      try {
        const id = region.region.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        await databases.createDocument(
          DATABASE_ID,
          'regions',
          id,
          {
            name: region.region,
            nameAr: region.region,
            count: parseInt(region.count)
          }
        );
        regionCount++;
      } catch (e) {
        if (e.code !== 409) console.log(`   ⚠️  Region ${region.region}: ${e.message}`);
      }
    }
    console.log(`✅ Migrated ${regionCount}/${regionsResult.rows.length} regions\n`);

    await pgClient.end();

  } catch (error) {
    console.error('❌ Migration error:', error.message);
  }
}

async function run() {
  try {
    await createCollections();
    await migrateData();
    
    console.log('\n========================================');
    console.log('  ✨ Migration Complete!');
    console.log('========================================\n');
    console.log(`View your data: https://cloud.appwrite.io/console/project-${PROJECT_ID}/databases/database-${DATABASE_ID}\n`);
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
  }
}

run();
