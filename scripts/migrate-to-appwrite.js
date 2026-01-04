#!/usr/bin/env node

/**
 * Data Migration Script for Appwrite
 * Parses SQL INSERT statements and uploads them to Appwrite collections.
 * Fixes: Data type enforcement (phone/mobile as string) and delay between requests.
 */

const fs = require('fs');
const readline = require('readline');
const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config();

// Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '694ba83300116af11b75';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '695a84140031c5a93745';
const SQL_FILE_PATH = 'c:/Users/ahmed/Downloads/reallisting/scripts/backup/backup_1767489617809.sql';

if (!APPWRITE_API_KEY) {
  console.error('❌ Error: APPWRITE_API_KEY environment variable is required');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

// Regular expression to match INSERT INTO table (cols) VALUES (vals);
const insertRegex = /INSERT INTO (\w+) \((.*?)\) VALUES \((.*)\);/i;

function parseValues(valString) {
  const values = [];
  let current = '';
  let inString = false;

  for (let i = 0; i < valString.length; i++) {
    const char = valString[i];
    if (char === "'" && (i === 0 || valString[i - 1] !== "\\")) {
      inString = !inString;
      current += char;
    } else if (char === ',' && !inString) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function cleanValue(val, targetType = 'string') {
  if (val.toUpperCase() === 'NULL') return null;

  let isQuoted = false;
  if (val.startsWith("'") && val.endsWith("'")) {
    val = val.substring(1, val.length - 1).replace(/''/g, "'");
    isQuoted = true;
  }

  if (targetType === 'boolean') {
    return !!(Number(val));
  }

  if (targetType === 'integer' || targetType === 'double') {
    if (val === '' || isNaN(val)) return null;
    return Number(val);
  }

  // default to string
  return String(val);
}

async function migrate() {
  console.log('🚀 Starting Data Migration to Appwrite...\n');

  const fileStream = fs.createReadStream(SQL_FILE_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const pendingData = {
    regions: [], categories: [], property_types: [], purposes: [], sender: [], users: [], messages: []
  };

  const schemaInfo = {
    users: { is_active: 'boolean', is_admin: 'boolean', mobile: 'string', phone: 'string' },
    sender: { mobile: 'string', name: 'string' },
    messages: { sender_id: 'integer', region_id: 'integer', property_type_id: 'integer', category_id: 'integer', purpose_id: 'integer' }
  };

  console.log('📖 Parsing SQL file...');
  for await (const line of rl) {
    const match = line.match(insertRegex);
    if (match) {
      const table = match[1].toLowerCase();
      if (!pendingData[table]) continue;

      const keys = match[2].split(',').map(k => k.trim());
      const rawValues = parseValues(match[3]);

      const data = {};
      keys.forEach((key, i) => {
        const type = (schemaInfo[table] && schemaInfo[table][key]) || 'string';
        data[key] = cleanValue(rawValues[i], type);
      });

      pendingData[table].push(data);
    }
  }

  console.log('✅ Parsing complete. Starting upload...');

  const order = ['regions', 'categories', 'property_types', 'purposes', 'sender', 'users', 'messages'];
  for (const table of order) {
    const items = pendingData[table];
    console.log(`\n📤 Migrating ${items.length} items to ${table}...`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const docId = item.id ? String(item.id) : ID.unique();
      delete item.id;

      try {
        await databases.createDocument(DATABASE_ID, table, docId, item);
        if ((i + 1) % 100 === 0) console.log(`  - Uploaded ${i + 1}/${items.length}`);
        if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 30)); // Slight throttle
      } catch (error) {
        if (error.code === 409) {
          // Skip
        } else {
          console.error(`  - ❌ Error uploading row ${i + 1} to ${table} (ID: ${docId}):`, error.message);
          if (error.message.includes('Bad Gateway') || error.message.includes('Rate limit')) {
            console.log('  🕒 Waiting 2s before retry...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
              await databases.createDocument(DATABASE_ID, table, docId, item);
              console.log(`  - Retried and uploaded ${docId}`);
            } catch (e) {
              console.error(`  - ❌ Retry failed for ${docId}`);
            }
          }
        }
      }
    }
    console.log(`✅ ${table} migration finished`);
  }

  console.log('\n✨ All data migration tasks completed!');
}

migrate().catch(console.error);
