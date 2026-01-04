const { Client, Storage, Functions, ID } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

const ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '694ba83300116af11b75';
const API_KEY = process.env.APPWRITE_API_KEY;

if (!API_KEY) {
  console.error('❌ APPWRITE_API_KEY not found in environment');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const functions = new Functions(client);
const storage = new Storage(client);

// Function configurations
const FUNCTIONS_CONFIG = [
  {
    name: 'auth',
    file: 'api/auth-appwrite.js',
    runtime: 'node-18.0',
    execute: ['any'],
    events: [],
    timeout: 15
  },
  {
    name: 'messages',
    file: 'api/messages-appwrite.js',
    runtime: 'node-18.0',
    execute: ['any'],
    events: [],
    timeout: 15
  },
  {
    name: 'admin',
    file: 'api/admin-appwrite.js',
    runtime: 'node-18.0',
    execute: ['any'],
    events: [],
    timeout: 15
  },
  {
    name: 'stats',
    file: 'api/stats-appwrite.js',
    runtime: 'node-18.0',
    execute: ['any'],
    events: [],
    timeout: 15
  },
  {
    name: 'regions',
    file: 'api/regions-appwrite.js',
    runtime: 'node-18.0',
    execute: ['any'],
    events: [],
    timeout: 15
  }
];

async function deployFunctions() {
  console.log('🚀 Deploying Functions to Appwrite...\n');

  for (const config of FUNCTIONS_CONFIG) {
    try {
      console.log(`📦 Creating function: ${config.name}`);
      
      // Create function
      const func = await functions.create(
        ID.unique(),
        config.name,
        config.runtime,
        config.execute,
        config.events,
        '',
        config.timeout,
        true
      );

      console.log(`✅ Function created: ${func.$id}`);
      console.log(`   Name: ${config.name}`);
      console.log(`   Runtime: ${config.runtime}`);
      console.log(`   Endpoint: ${ENDPOINT}/functions/${func.$id}/executions\n`);

      // Note: Code deployment requires tar/gz file upload
      console.log(`⚠️  To deploy code for ${config.name}:`);
      console.log(`   1. Go to Appwrite Console → Functions → ${config.name}`);
      console.log(`   2. Click "Deploy" → "Manual"`);
      console.log(`   3. Upload: ${config.file} + lib/appwrite.js + package.json`);
      console.log(`   4. Set entrypoint: ${config.file}\n`);

    } catch (error) {
      if (error.code === 409) {
        console.log(`ℹ️  Function '${config.name}' already exists\n`);
      } else {
        console.error(`❌ Error creating ${config.name}:`, error.message, '\n');
      }
    }
  }

  console.log('✨ Function deployment preparation complete!');
  console.log('\n📝 Next Steps:');
  console.log('1. Go to Appwrite Console → Functions');
  console.log('2. For each function, click "Deploy" and upload the code');
  console.log('3. Set environment variables in each function');
  console.log('4. Test the functions\n');
}

async function createStorageBucket() {
  console.log('📦 Creating Storage Bucket for Static Files...\n');

  try {
    const bucket = await storage.createBucket(
      'website',
      'Website Static Files',
      ['read("any")'],
      ['create("users")', 'update("users")', 'delete("users")'],
      true,
      true,
      50000000,
      ['jpg', 'png', 'gif', 'webp', 'svg', 'html', 'css', 'js', 'json', 'txt', 'ico', 'woff', 'woff2', 'ttf']
    );

    console.log('✅ Storage bucket created!');
    console.log(`   Bucket ID: ${bucket.$id}`);
    console.log(`   Name: ${bucket.name}\n`);
    console.log('📤 Upload your build files:');
    console.log(`   Go to: ${ENDPOINT}/console/project-${PROJECT_ID}/storage/bucket-${bucket.$id}`);
    console.log('   Upload all files from the "build" folder\n');

  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  Storage bucket already exists\n');
    } else {
      console.error('❌ Error creating bucket:', error.message, '\n');
    }
  }
}

async function deploy() {
  console.log('========================================');
  console.log('  Appwrite Deployment Script');
  console.log('========================================\n');

  await createStorageBucket();
  await deployFunctions();

  console.log('========================================');
  console.log('  Deployment Complete!');
  console.log('========================================\n');
  console.log(`🔗 Your Project: https://cloud.appwrite.io/console/project-${PROJECT_ID}`);
  console.log(`🔗 Storage: https://cloud.appwrite.io/console/project-${PROJECT_ID}/storage`);
  console.log(`🔗 Functions: https://cloud.appwrite.io/console/project-${PROJECT_ID}/functions\n`);
}

deploy().catch(console.error);
