#!/usr/bin/env node

/**
 * Appwrite Database Setup Script
 * Creates database, collections, and indexes for Reallisting platform
 * Based on verified SQL schema.
 */

const { Client, Databases, Permission, Role } = require('node-appwrite');
require('dotenv').config();

// Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '694ba83300116af11b75';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '695a84140031c5a93745';

// Initialize client
console.log('🔌 Initializing Appwrite client...');
console.log('  - Endpoint:', APPWRITE_ENDPOINT);
console.log('  - Project ID:', APPWRITE_PROJECT_ID);

if (!APPWRITE_API_KEY) {
  console.error('❌ Error: APPWRITE_API_KEY is not set in environment or .env file');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
console.log('✅ Client initialized');

// Helper to wait for attribute/index creation
const wait = (ms) => new Promise(res => setTimeout(res, ms));

async function createAttribute(dbId, collId, type, key, required = false, size = 255) {
  try {
    console.log(`  - Creating ${type} attribute: ${key}`);
    const method = `create${type.charAt(0).toUpperCase() + type.slice(1)}Attribute`;
    if (type === 'string') {
      await databases[method](dbId, collId, key, size, required);
    } else {
      await databases[method](dbId, collId, key, required);
    }
    await wait(1000); // Allow time for creation
  } catch (error) {
    if (error.code === 409) console.log(`  - Attribute ${key} already exists`);
    else throw error;
  }
}

async function setupDatabase() {
  console.log('🚀 Starting Appwrite database setup...\n');

  const collections = [
    { id: 'regions', name: 'Regions', attrs: [['string', 'name', true, 200], ['datetime', 'created_at', false]] },
    { id: 'categories', name: 'Categories', attrs: [['string', 'name', true, 100], ['datetime', 'created_at', false]] },
    { id: 'property_types', name: 'Property Types', attrs: [['string', 'name', true, 100], ['datetime', 'created_at', false]] },
    { id: 'purposes', name: 'Purposes', attrs: [['string', 'name', true, 100], ['datetime', 'created_at', false]] },
    {
      id: 'sender', name: 'Sender', attrs: [
        ['string', 'name', true, 200],
        ['string', 'mobile', true, 30],
        ['string', 'first_seen_date', false, 50],
        ['string', 'first_seen_time', false, 50],
        ['datetime', 'updated_at', false],
        ['datetime', 'created_at', false]
      ]
    },
    {
      id: 'users', name: 'Users', attrs: [
        ['string', 'mobile', true, 30],
        ['string', 'password', true, 100],
        ['string', 'name', false, 100],
        ['string', 'role', false, 20],
        ['boolean', 'is_active', false],
        ['string', 'subscription_end_date', false, 50],
        ['string', 'username', false, 100],
        ['string', 'password_hash', false, 255],
        ['string', 'email', false, 100],
        ['string', 'phone', false, 30],
        ['boolean', 'is_admin', false],
        ['datetime', 'created_at', false]
      ]
    },
    {
      id: 'messages', name: 'Messages', attrs: [
        ['string', 'message', true, 20000],
        ['string', 'date_of_creation', false, 50],
        ['string', 'source_file', false, 200],
        ['string', 'image_url', false, 500],
        ['integer', 'sender_id', false],
        ['integer', 'region_id', false],
        ['integer', 'property_type_id', false],
        ['integer', 'category_id', false],
        ['integer', 'purpose_id', false],
        ['datetime', 'created_at', false]
      ]
    }
  ];

  for (const coll of collections) {
    console.log(`📦 Setting up collection: ${coll.name} (${coll.id})...`);
    try {
      await databases.createCollection(DATABASE_ID, coll.id, coll.name, [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any())
      ]);
      console.log(` ✅ Collection ${coll.id} created`);
    } catch (error) {
      if (error.code === 409) console.log(` ℹ️  Collection ${coll.id} already exists`);
      else throw error;
    }

    for (const attr of coll.attrs) {
      await createAttribute(DATABASE_ID, coll.id, ...attr);
    }
  }

  console.log('\n✨ Database setup completed successfully!');
}

setupDatabase().catch(err => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});
