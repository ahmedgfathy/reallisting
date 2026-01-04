#!/usr/bin/env node

/**
 * Migrate SQL Backup to Appwrite
 * Reads backup_1767489617809.sql and migrates to Appwrite
 */

const { Client, Databases, ID, Permission, Role } = require('node-appwrite');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '694ba83300116af11b75';
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '695a84140031c5a93745';
const BACKUP_FILE = path.join(__dirname, 'backup', 'backup_1767489617809.sql');

console.log('========================================');
console.log('  SQL Backup → Appwrite Migration');
console.log('========================================\n');

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

// Parse SQL INSERT statements
function parseInserts(sql, tableName) {
  const insertRegex = new RegExp(
    `INSERT INTO ${tableName} \\(([^)]+)\\) VALUES \\(([^;]+)\\);`,
    'gi'
  );
  
  const records = [];
  let match;
  
  while ((match = insertRegex.exec(sql)) !== null) {
    const columns = match[1].split(',').map(c => c.trim());
    const valuesStr = match[2];
    
    // Parse values (handle quotes and NULLs)
    const values = [];
    let current = '';
    let inQuote = false;
    
    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];
      
      if (char === "'" && valuesStr[i - 1] !== '\\') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    // Create object
    const record = {};
    columns.forEach((col, idx) => {
      let value = values[idx];
      
      if (value === 'NULL') {
        record[col] = null;
      } else if (value.startsWith("'") && value.endsWith("'")) {
        record[col] = value.slice(1, -1).replace(/\\'/g, "'");
      } else {
        record[col] = value;
      }
    });
    
    records.push(record);
  }
  
  return records;
}

async function createCollections() {
  console.log('📦 Creating collections...\n');

  const collections = {
    users: {
      attributes: [
        { key: 'mobile', type: 'string', size: 20, required: true },
        { key: 'role', type: 'string', size: 20, required: true },
        { key: 'isActive', type: 'boolean', required: true },
        { key: 'name', type: 'string', size: 100, required: false },
        { key: 'subscriptionEndDate', type: 'datetime', required: false },
        { key: 'createdAt', type: 'datetime', required: false }
      ]
    },
    messages: {
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
        { key: 'senderId', type: 'integer', required: false },
        { key: 'dateOfCreation', type: 'datetime', required: false },
        { key: 'createdAt', type: 'datetime', required: false }
      ]
    },
    sender: {
      attributes: [
        { key: 'name', type: 'string', size: 100, required: true },
        { key: 'mobile', type: 'string', size: 20, required: true },
        { key: 'firstSeenDate', type: 'string', size: 100, required: false },
        { key: 'firstSeenTime', type: 'string', size: 50, required: false },
        { key: 'updatedAt', type: 'datetime', required: false },
        { key: 'createdAt', type: 'datetime', required: false }
      ]
    }
  };

  for (const [collectionId, config] of Object.entries(collections)) {
    try {
      // Check if exists
      try {
        await databases.getCollection(DATABASE_ID, collectionId);
        console.log(`✅ Collection "${collectionId}" exists\n`);
        continue;
      } catch (e) {}

      // Create collection
      await databases.createCollection(
        DATABASE_ID,
        collectionId,
        collectionId.charAt(0).toUpperCase() + collectionId.slice(1),
        [
          Permission.read(Role.any()),
          Permission.create(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ],
        false
      );

      console.log(`✅ Created collection: ${collectionId}`);
      await new Promise(r => setTimeout(r, 2000));

      // Create attributes
      for (const attr of config.attributes) {
        try {
          if (attr.type === 'string') {
            await databases.createStringAttribute(DATABASE_ID, collectionId, attr.key, attr.size, attr.required);
          } else if (attr.type === 'boolean') {
            await databases.createBooleanAttribute(DATABASE_ID, collectionId, attr.key, attr.required);
          } else if (attr.type === 'datetime') {
            await databases.createDatetimeAttribute(DATABASE_ID, collectionId, attr.key, attr.required);
          } else if (attr.type === 'integer') {
            await databases.createIntegerAttribute(DATABASE_ID, collectionId, attr.key, attr.required);
          }
          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          if (err.code !== 409) console.log(`   ⚠️  ${attr.key}: ${err.message}`);
        }
      }
      console.log(`   Attributes created\n`);
    } catch (error) {
      console.error(`❌ Error with ${collectionId}:`, error.message, '\n');
    }
  }
}

async function migrateData() {
  console.log('📊 Reading SQL backup file...\n');

  const sqlContent = fs.readFileSync(BACKUP_FILE, 'utf8');

  // Migrate Users
  console.log('👥 Migrating users...');
  const users = parseInserts(sqlContent, 'users');
  let userCount = 0;
  
  for (const user of users) {
    try {
      await databases.createDocument(DATABASE_ID, 'users', user.id.toString(), {
        mobile: user.mobile || '',
        role: user.role || 'broker',
        isActive: parseInt(user.is_active) === 1,
        name: user.name || '',
        subscriptionEndDate: user.subscription_end_date || null,
        createdAt: user.created_at || new Date().toISOString()
      });
      userCount++;
    } catch (e) {
      if (e.code !== 409) console.log(`   ⚠️  User ${user.mobile}: ${e.message}`);
    }
  }
  console.log(`✅ Migrated ${userCount}/${users.length} users\n`);

  // Migrate Senders
  console.log('📞 Migrating senders...');
  const senders = parseInserts(sqlContent, 'sender');
  let senderCount = 0;
  
  for (const sender of senders) {
    try {
      await databases.createDocument(DATABASE_ID, 'sender', sender.id.toString(), {
        name: sender.name || '',
        mobile: sender.mobile || '',
        firstSeenDate: sender.first_seen_date || '',
        firstSeenTime: sender.first_seen_time || '',
        updatedAt: sender.updated_at || new Date().toISOString(),
        createdAt: sender.created_at || new Date().toISOString()
      });
      senderCount++;
    } catch (e) {
      if (e.code !== 409) console.log(`   ⚠️  Sender ${sender.name}: ${e.message}`);
    }
  }
  console.log(`✅ Migrated ${senderCount}/${senders.length} senders\n`);

  // Migrate Messages (in batches)
  console.log('💬 Migrating messages (this will take time)...');
  const messages = parseInserts(sqlContent, 'messages');
  let msgCount = 0;
  
  for (const msg of messages) {
    try {
      await databases.createDocument(DATABASE_ID, 'messages', msg.id.toString(), {
        message: msg.message || '',
        category: msg.category || 'أخرى',
        propertyType: msg.property_type || 'أخرى',
        region: msg.region || 'أخرى',
        purpose: msg.purpose || 'أخرى',
        sourceFile: msg.source_file || '',
        imageUrl: msg.image_url || '',
        senderName: msg.sender_name || '',
        senderMobile: msg.sender_mobile || '',
        senderId: parseInt(msg.sender_id) || null,
        dateOfCreation: msg.date_of_creation || new Date().toISOString(),
        createdAt: msg.created_at || new Date().toISOString()
      });
      msgCount++;
      if (msgCount % 100 === 0) {
        console.log(`   📦 Migrated ${msgCount}/${messages.length} messages...`);
      }
    } catch (e) {
      if (e.code !== 409 && msgCount < 5) {
        console.log(`   ⚠️  Message: ${e.message}`);
      }
    }
  }
  console.log(`✅ Migrated ${msgCount}/${messages.length} messages\n`);
}

async function run() {
  try {
    if (!fs.existsSync(BACKUP_FILE)) {
      console.error(`❌ Backup file not found: ${BACKUP_FILE}`);
      process.exit(1);
    }

    await createCollections();
    console.log('\n⏳ Waiting for collections to be ready...\n');
    await new Promise(r => setTimeout(r, 5000));
    
    await migrateData();

    console.log('\n========================================');
    console.log('  ✨ Migration Complete!');
    console.log('========================================\n');
    console.log(`View: https://cloud.appwrite.io/console/project-${PROJECT_ID}/databases/database-${DATABASE_ID}\n`);
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
  }
}

run();
