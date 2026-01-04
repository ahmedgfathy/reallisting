#!/usr/bin/env node
/**
 * Emergency Backup: Export from Prisma/Current DB to SQLite
 * Usage: node backup-to-sqlite.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database URL - use Prisma URL temporarily to export
const DATABASE_URL = process.env.POSTGRES_URL || 
                     process.env.listing_realestates_POSTGRES_URL ||
                     'postgres://823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1:sk_iv0LK6rujPpicqk6uuUaE@db.prisma.io:5432/postgres?sslmode=require';

const OUTPUT_DIR = path.join(__dirname, 'backup');
const SQLITE_FILE = path.join(OUTPUT_DIR, `backup_${Date.now()}.sql`);

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🔄 Starting emergency backup...\n');
console.log(`📁 Output: ${SQLITE_FILE}\n`);

async function exportToSQLite() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    let sqlOutput = `-- SQLite Backup Export
-- Generated: ${new Date().toISOString()}
-- Database: PostgreSQL → SQLite
\n`;

    // Tables to export
    const tables = ['users', 'sender', 'messages', 'regions', 'categories', 'property_types', 'purposes', 'password_reset_requests'];

    for (const table of tables) {
      try {
        console.log(`📦 Exporting ${table}...`);
        
        // Get table schema
        const schemaResult = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table]);

        if (schemaResult.rows.length === 0) {
          console.log(`   ⚠️  Table ${table} not found, skipping...`);
          continue;
        }

        // Create SQLite CREATE TABLE statement
        sqlOutput += `\n-- Table: ${table}\n`;
        sqlOutput += `DROP TABLE IF EXISTS ${table};\n`;
        sqlOutput += `CREATE TABLE ${table} (\n`;
        
        const columns = schemaResult.rows.map((col, idx) => {
          let sqliteType = col.data_type;
          // Convert PostgreSQL types to SQLite
          if (sqliteType.includes('int')) sqliteType = 'INTEGER';
          else if (sqliteType.includes('char') || sqliteType.includes('text')) sqliteType = 'TEXT';
          else if (sqliteType.includes('bool')) sqliteType = 'INTEGER';
          else if (sqliteType.includes('timestamp')) sqliteType = 'TEXT';
          else sqliteType = 'TEXT';
          
          let colDef = `  ${col.column_name} ${sqliteType}`;
          if (col.column_name === 'id') colDef += ' PRIMARY KEY';
          if (col.is_nullable === 'NO' && col.column_name !== 'id') colDef += ' NOT NULL';
          
          return colDef;
        }).join(',\n');
        
        sqlOutput += columns + '\n);\n\n';

        // Get data
        const dataResult = await client.query(`SELECT * FROM ${table} LIMIT 100000`);
        console.log(`   ✅ Found ${dataResult.rows.length} rows`);

        if (dataResult.rows.length > 0) {
          // Generate INSERT statements
          for (const row of dataResult.rows) {
            const cols = Object.keys(row);
            const values = cols.map(col => {
              const val = row[col];
              if (val === null) return 'NULL';
              if (typeof val === 'boolean') return val ? '1' : '0';
              if (typeof val === 'number') return val;
              if (val instanceof Date) return `'${val.toISOString()}'`;
              // Escape single quotes
              return `'${String(val).replace(/'/g, "''")}'`;
            });
            
            sqlOutput += `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${values.join(', ')});\n`;
          }
          sqlOutput += '\n';
        }

      } catch (tableError) {
        console.log(`   ❌ Error exporting ${table}: ${tableError.message}`);
      }
    }

    // Write to file
    fs.writeFileSync(SQLITE_FILE, sqlOutput, 'utf8');
    const fileSize = (fs.statSync(SQLITE_FILE).size / 1024).toFixed(2);
    
    console.log('\n✅ Backup complete!');
    console.log(`📄 File: ${SQLITE_FILE}`);
    console.log(`📊 Size: ${fileSize} KB\n`);

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

exportToSQLite().catch(console.error);
