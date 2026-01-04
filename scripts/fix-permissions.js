#!/usr/bin/env node

/**
 * Fix Collection Permissions for Migration
 */

const { Client, Databases, Permission, Role } = require('node-appwrite');
require('dotenv').config();

const ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '694ba83300116af11b75';
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '695a84140031c5a93745';

if (!API_KEY) {
  console.error('❌ APPWRITE_API_KEY not found');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

const collections = ['users', 'messages', 'regions'];

async function fixPermissions() {
  console.log('🔧 Fixing Collection Permissions...\n');

  for (const collectionId of collections) {
    try {
      console.log(`📝 Updating ${collectionId} collection...`);
      
      await databases.updateCollection(
        DATABASE_ID,
        collectionId,
        collectionId.charAt(0).toUpperCase() + collectionId.slice(1),
        [
          Permission.read(Role.any()),
          Permission.create(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ],
        false,
        false
      );
      
      console.log(`✅ ${collectionId} permissions updated\n`);
    } catch (error) {
      console.error(`❌ Failed to update ${collectionId}:`, error.message);
      console.log(`   Manual fix: https://cloud.appwrite.io/console/project-${PROJECT_ID}/databases/database-${DATABASE_ID}/collection-${collectionId}/settings\n`);
    }
  }

  console.log('✨ Permission update complete!');
  console.log('\nNow retry migration:');
  console.log('  node scripts\\migrate-to-appwrite.js\n');
}

fixPermissions().catch(console.error);
