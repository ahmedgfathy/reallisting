#!/usr/bin/env node

/**
 * Data Migration Script for Appwrite
 * Parses SQL INSERT statements and uploads them to Appwrite collections.
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
// Note: This is a simplified regex for SQLite/PostgreSQL exports
const insertRegex = /INSERT INTO (\w+) \((.*?)\) VALUES \((.*)\);/i;

function parseValues(valString) {
  // This handles basic SQL value strings: 'val', NULL, 123
  const values = [];
  let current = '';
  let inString = false;

  for (let i = 0; i < valString.length; i++) {
    const char = valString[i];
    if (char === "'" && (i === 0 || valString[i - 1] !== "\\")) {
      inString = !inString;
    } else if (char === ',' && !inString) {
      values.push(cleanValue(current.trim()));
      current = '';
    } else {
      current += char;
    }
  }
  values.push(cleanValue(current.trim()));
  return values;
}

function cleanValue(val) {
  if (val.toUpperCase() === 'NULL') return null;
  if (val.startsWith("'") && val.endsWith("'")) {
    return val.substring(1, val.length - 1).replace(/''/g, "'"); // Handle escaped single quotes
  }
  if (!isNaN(val)) return Number(val);
  return val;
}

async function migrate() {
  console.log('🚀 Starting Data Migration to Appwrite...\n');

  const fileStream = fs.createReadStream(SQL_FILE_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let counts = {};

  // Tables to process in order (to handle constraints)
  const order = ['regions', 'categories', 'property_types', 'purposes', 'sender', 'users', 'messages'];
  const pendingData = {
    regions: [], categories: [], property_types: [], purposes: [], sender: [], users: [], messages: []
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
        // Map common keys to camelCase if needed, but here we stay consistent with SQL discovery
        let value = rawValues[i];

        // Convert integer booleans for Appwrite
        if (table === 'users' && (key === 'is_active' || key === 'is_admin')) {
          value = !!value;
        }

        data[key] = value;
      });

      pendingData[table].push(data);
    }
  }

  console.log('✅ Parsing complete. Starting upload...');

  for (const table of order) {
    const items = pendingData[table];
    console.log(`\n📤 Migrating ${items.length} items to ${table}...`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const docId = item.id ? String(item.id) : ID.unique();
      delete item.id; // Doc ID is separate in Appwrite

      try {
        await databases.createDocument(DATABASE_ID, table, docId, item);
        if ((i + 1) % 50 === 0) console.log(`  - Uploaded ${i + 1}/${items.length}`);
      } catch (error) {
        if (error.code === 409) {
          // console.log(`  - [Conflict] Item ${docId} already exists in ${table}`);
        } else {
          console.error(`  - ❌ Error uploading to ${table} (${docId}):`, error.message);
        }
      }
    }
    console.log(`✅ ${table} migration finished`);
  }

  console.log('\n✨ All data migration tasks completed!');
}

migrate().catch(console.error);
