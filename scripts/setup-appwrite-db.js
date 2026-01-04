#!/usr/bin/env node

/**
 * Appwrite Database Setup Script
 * Creates database, collections, and indexes for Reallisting platform
 */

const { Client, Databases, ID, Permission, Role } = require('node-appwrite');

// Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '694ba83300116af11b75';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = 'reallisting';

if (!APPWRITE_API_KEY) {
  console.error('❌ Error: APPWRITE_API_KEY environment variable is required');
  console.error('Create an API key in Appwrite Console → Settings → API Keys');
  console.error('Grant all permissions (Database, Collections, Documents)');
  process.exit(1);
}

// Initialize client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function setupDatabase() {
  console.log('🚀 Starting Appwrite database setup...\n');

  try {
    // Create database
    console.log('📁 Creating database...');
    try {
      await databases.create(DATABASE_ID, 'Reallisting Database');
      console.log('✅ Database created: ' + DATABASE_ID);
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  Database already exists: ' + DATABASE_ID);
      } else {
        throw error;
      }
    }

    // Create Users Collection
    console.log('\n👥 Creating Users collection...');
    try {
      await databases.createCollection(
        DATABASE_ID,
        'users',
        'Users',
        [
          Permission.read(Role.any()),
          Permission.create(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ]
      );
      console.log('✅ Users collection created');

      // Add attributes
      await databases.createStringAttribute(DATABASE_ID, 'users', 'mobile', 20, true);
      await databases.createStringAttribute(DATABASE_ID, 'users', 'role', 20, true);
      await databases.createBooleanAttribute(DATABASE_ID, 'users', 'isActive', true);
      await databases.createStringAttribute(DATABASE_ID, 'users', 'name', 100, false);
      await databases.createDatetimeAttribute(DATABASE_ID, 'users', 'createdAt', false);
      
      console.log('✅ Users attributes created');
      
      // Create indexes
      await databases.createIndex(DATABASE_ID, 'users', 'mobile_index', 'key', ['mobile'], ['asc']);
      await databases.createIndex(DATABASE_ID, 'users', 'role_index', 'key', ['role'], ['asc']);
      console.log('✅ Users indexes created');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  Users collection already exists');
      } else {
        console.error('Error creating users collection:', error.message);
      }
    }

    // Create Messages Collection
    console.log('\n💬 Creating Messages collection...');
    try {
      await databases.createCollection(
        DATABASE_ID,
        'messages',
        'Messages',
        [
          Permission.read(Role.any()),
          Permission.create(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ]
      );
      console.log('✅ Messages collection created');

      // Add attributes
      await databases.createStringAttribute(DATABASE_ID, 'messages', 'message', 10000, true);
      await databases.createStringAttribute(DATABASE_ID, 'messages', 'category', 50, false);
      await databases.createStringAttribute(DATABASE_ID, 'messages', 'propertyType', 50, false);
      await databases.createStringAttribute(DATABASE_ID, 'messages', 'region', 100, false);
      await databases.createStringAttribute(DATABASE_ID, 'messages', 'purpose', 50, false);
      await databases.createStringAttribute(DATABASE_ID, 'messages', 'sourceFile', 100, false);
      await databases.createStringAttribute(DATABASE_ID, 'messages', 'imageUrl', 500, false);
      await databases.createStringAttribute(DATABASE_ID, 'messages', 'senderName', 100, false);
      await databases.createStringAttribute(DATABASE_ID, 'messages', 'senderMobile', 20, false);
      await databases.createDatetimeAttribute(DATABASE_ID, 'messages', 'dateOfCreation', false);
      await databases.createDatetimeAttribute(DATABASE_ID, 'messages', 'createdAt', false);
      
      console.log('✅ Messages attributes created');
      
      // Create indexes
      await databases.createIndex(DATABASE_ID, 'messages', 'category_index', 'key', ['category'], ['asc']);
      await databases.createIndex(DATABASE_ID, 'messages', 'propertyType_index', 'key', ['propertyType'], ['asc']);
      await databases.createIndex(DATABASE_ID, 'messages', 'region_index', 'key', ['region'], ['asc']);
      await databases.createIndex(DATABASE_ID, 'messages', 'purpose_index', 'key', ['purpose'], ['asc']);
      await databases.createIndex(DATABASE_ID, 'messages', 'createdAt_index', 'key', ['createdAt'], ['desc']);
      
      // Full-text search index
      await databases.createIndex(DATABASE_ID, 'messages', 'message_search', 'fulltext', ['message'], ['asc']);
      
      console.log('✅ Messages indexes created');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  Messages collection already exists');
      } else {
        console.error('Error creating messages collection:', error.message);
      }
    }

    // Create Regions Collection
    console.log('\n🗺️  Creating Regions collection...');
    try {
      await databases.createCollection(
        DATABASE_ID,
        'regions',
        'Regions',
        [
          Permission.read(Role.any()),
          Permission.create(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ]
      );
      console.log('✅ Regions collection created');

      // Add attributes
      await databases.createStringAttribute(DATABASE_ID, 'regions', 'name', 100, true);
      await databases.createStringAttribute(DATABASE_ID, 'regions', 'nameAr', 100, false);
      await databases.createIntegerAttribute(DATABASE_ID, 'regions', 'count', false);
      
      console.log('✅ Regions attributes created');
      
      // Create index
      await databases.createIndex(DATABASE_ID, 'regions', 'name_index', 'key', ['name'], ['asc']);
      console.log('✅ Regions indexes created');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  Regions collection already exists');
      } else {
        console.error('Error creating regions collection:', error.message);
      }
    }

    console.log('\n✨ Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your .env file with APPWRITE_API_KEY');
    console.log('2. Run npm install to install Appwrite dependencies');
    console.log('3. Deploy your application');
    console.log('\n🔗 Database ID: ' + DATABASE_ID);
    console.log('🔗 Collections: users, messages, regions');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

// Run setup
setupDatabase().catch(console.error);
