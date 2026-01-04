#!/usr/bin/env node

/**
 * Performance-optimized migration script featuring concurrent batching
 * and robust ID mapping for Appwrite compatibility.
 */

const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');
const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config();

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

const insertRegex = /INSERT INTO (\w+) \((.*?)\) VALUES \((.*)\);/i;

function parseValues(valString) {
  const values = [];
  let current = '';
  let inString = false;
  if (!valString) return [];
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
  if (val === undefined || val === null || val === '') return null;
  const upperVal = typeof val === 'string' ? val.toUpperCase() : '';
  if (upperVal === 'NULL' || upperVal === '') return null;
  let processed = val;
  if (typeof processed === 'string' && processed.startsWith("'") && processed.endsWith("'")) {
    processed = processed.substring(1, processed.length - 1).replace(/''/g, "'");
  }
  if (targetType === 'boolean') return !!(Number(processed));
  if (targetType === 'integer' || targetType === 'double') {
    if (processed === '' || isNaN(processed)) return null;
    return Number(processed);
  }
  return String(processed);
}

// Helper to make ID appwrite-compatible (max 36 chars, valid chars only)
function getValidId(originalId) {
  if (!originalId) return ID.unique();
  const idStr = String(originalId);
  // If it's already a clean ID and within length, use it
  if (/^[a-zA-Z0-9._-]+$/.test(idStr) && idStr.length <= 36 && !/^[._-]/.test(idStr)) {
    return idStr;
  }
  // Otherwise, hash it to ensure it's valid, idempotent, and within length
  return crypto.createHash('md5').update(idStr).digest('hex');
}

async function migrate() {
  console.log('🚀 Starting Robust Optimized Data Migration...\n');
  const fileStream = fs.createReadStream(SQL_FILE_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  const pendingData = { regions: [], categories: [], property_types: [], purposes: [], sender: [], users: [], messages: [] };
  const schemaInfo = {
    users: { is_active: 'boolean', is_admin: 'boolean' },
    messages: { sender_id: 'integer', region_id: 'integer', property_type_id: 'integer', category_id: 'integer', purpose_id: 'integer' }
  };

  console.log('📖 Parsing SQL file...');
  for await (const line of rl) {
    const match = line.match(insertRegex);
    if (!match) continue;
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

  const CONCURRENCY = 8;
  const order = ['regions', 'categories', 'property_types', 'purposes', 'sender', 'users', 'messages'];

  for (const table of order) {
    const items = pendingData[table];
    if (items.length === 0) continue;
    console.log(`\n📤 Migrating ${items.length} items to ${table} (Concurrency: ${CONCURRENCY})...`);

    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const batch = items.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(async (item, idx) => {
        const docId = getValidId(item.id);
        delete item.id;
        try {
          await databases.createDocument(DATABASE_ID, table, docId, item);
        } catch (error) {
          if (error.code !== 409) {
            console.error(`\n  - ❌ Error [${table}:${docId}]:`, error.message);
          }
        }
      }));
      if ((i + CONCURRENCY) % 100 === 0 || (i + CONCURRENCY) >= items.length) {
        process.stdout.write(`\r  - Progress: ${Math.min(i + CONCURRENCY, items.length)}/${items.length}`);
      }
    }
    console.log(`\n✅ ${table} migration finished`);
  }
  console.log('\n✨ All tasks completed!');
}

migrate().catch(console.error);
