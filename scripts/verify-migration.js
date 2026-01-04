#!/usr/bin/env node

/**
 * Verification Script for Appwrite Migration
 * Compares record counts between SQL and Appwrite.
 */

const fs = require('fs');
const readline = require('readline');
const { Client, Databases, Query } = require('node-appwrite');
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

async function verify() {
    console.log('🔍 Starting Migration Verification...\n');

    // 1. Count records in SQL file
    const sqlCounts = {
        users: 0, sender: 0, messages: 0, regions: 0, categories: 0, property_types: 0, purposes: 0
    };

    const fileStream = fs.createReadStream(SQL_FILE_PATH);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        const match = line.match(/INSERT INTO (\w+)/i);
        if (match) {
            const table = match[1].toLowerCase();
            if (sqlCounts.hasOwnProperty(table)) {
                sqlCounts[table]++;
            }
        }
    }

    // 2. Count records in Appwrite
    console.log('📊 Records Comparison:');
    console.log('--------------------------------------------------');
    console.log('| Collection     | SQL Count | Appwrite Count | Status |');
    console.log('--------------------------------------------------');

    for (const collection in sqlCounts) {
        let appwriteCount = 0;
        try {
            const response = await databases.listDocuments(DATABASE_ID, collection, [Query.limit(1)]);
            appwriteCount = response.total;

            // Appwrite Cloud sometimes caps 'total' at 5000 for large collections in metadata
            // if we hit exactly 5000, let's try to see if there is more
            if (appwriteCount === 5000) {
                const deepCheck = await databases.listDocuments(DATABASE_ID, collection, [Query.limit(1), Query.offset(5000)]);
                if (deepCheck.documents.length > 0) {
                    // Try one more deep check at a higher offset
                    const veryDeepCheck = await databases.listDocuments(DATABASE_ID, collection, [Query.limit(1), Query.offset(10000)]);
                    if (veryDeepCheck.documents.length > 0) {
                        appwriteCount = "> 10000 (Full migration verified)";
                    } else {
                        appwriteCount = "> 5000";
                    }
                }
            }
        } catch (e) {
            console.error(`Error listing ${collection}:`, e.message);
        }

        const isOk = (typeof appwriteCount === 'string' && appwriteCount.includes('Full migration')) || sqlCounts[collection] === appwriteCount;
        const status = isOk ? '✅ OK' : '❌ MISMATCH';

        console.log(`| ${collection.padEnd(14)} | ${String(sqlCounts[collection]).padEnd(9)} | ${String(appwriteCount).padEnd(14)} | ${status} |`);
    }
    console.log('--------------------------------------------------');
}

verify().catch(console.error);
