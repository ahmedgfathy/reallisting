# Manual SQL Migration Guide

Since Node.js is not available, follow these steps for manual migration:

## Step 1: Export from Supabase

1. **Go to Supabase Dashboard** → Your Project → **SQL Editor**

2. **Run these queries one by one** and save the results:

### Export Users:
```sql
SELECT * FROM users;
```
Copy the results (you'll need them for import)

### Export Sender:
```sql
SELECT * FROM sender;
```

### Export Reference Tables:
```sql
SELECT * FROM regions ORDER BY id;
SELECT * FROM property_types ORDER BY id;
SELECT * FROM categories ORDER BY id;
SELECT * FROM purposes ORDER BY id;
```

### Export Messages:
```sql
SELECT * FROM messages ORDER BY created_at DESC;
```

## Step 2: Connect to Prisma Database

Use one of these tools to connect to your Prisma database:

**Connection String:**
```
postgres://f11e710b7d986b219e49bb8beefa7da1e98c3ed708b6af5ed1bbad609adb6b30:sk_9m1HEldAF6Mb8n96eN0wN@db.prisma.io:5432/postgres?sslmode=require
```

**Options:**
- Use Prisma Studio: https://cloud.prisma.io
- Use DBeaver, pgAdmin, or any PostgreSQL client
- Use online SQL client: https://sql.js.org/

## Step 3: Create Schema in Prisma

Run the SQL from `scripts/migration/import-sql.sql` (the CREATE TABLE section)

## Step 4: Import Data

Copy your exported data and insert it into Prisma database using INSERT statements or the import tool.

## Step 5: Update Vercel

1. Go to **Vercel** → **Settings** → **Environment Variables**
2. Add:
   ```
   POSTGRES_URL=postgres://f11e710b7d986b219e49bb8beefa7da1e98c3ed708b6af5ed1bbad609adb6b30:sk_9m1HEldAF6Mb8n96eN0wN@db.prisma.io:5432/postgres?sslmode=require
   ```
3. Remove:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy: `git push origin master`

## Alternative: Use Prisma Studio

1. Install Node.js from: https://nodejs.org/
2. Then run the automated scripts:
   ```bash
   npm install pg
   node scripts/migration/export-supabase.js
   node scripts/migration/import-to-prisma.js
   ```

## ⚠️ Important

After migration, **rotate your database credentials** since they're exposed in this chat!
