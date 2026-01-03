# Manual Migration Without Node.js

Since Node.js isn't available, follow these steps:

## Step 1: Create Schema in Prisma

1. Go to: https://cloud.prisma.io/
2. Login and select your database
3. Go to **Console** or **SQL Editor**
4. Copy and paste the contents of `import-sql.sql`
5. Click **Run** or **Execute**

## Step 2: Export Data from Supabase

1. Go to: https://supabase.com/dashboard
2. Select your project: `gxyrpboyubpycejlkxue`
3. Go to **SQL Editor**
4. Run these queries one by one and download results as CSV:

### Export Users
```sql
SELECT * FROM users;
```
Download as CSV → save as `users.csv`

### Export Sender
```sql
SELECT * FROM sender;
```
Download as CSV → save as `sender.csv`

### Export Regions
```sql
SELECT * FROM regions;
```
Download as CSV → save as `regions.csv`

### Export Property Types
```sql
SELECT * FROM property_types;
```
Download as CSV → save as `property_types.csv`

### Export Categories
```sql
SELECT * FROM categories;
```
Download as CSV → save as `categories.csv`

### Export Purposes
```sql
SELECT * FROM purposes;
```
Download as CSV → save as `purposes.csv`

### Export Messages
```sql
SELECT * FROM messages;
```
Download as CSV → save as `messages.csv`

## Step 3: Import Data to Prisma

Use a PostgreSQL client like:
- **pgAdmin**: https://www.pgadmin.org/download/
- **DBeaver**: https://dbeaver.io/download/
- Or Prisma Console

### Connection Details:
```
Host: db.prisma.io
Port: 5432
Database: postgres
Username: 823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1
Password: sk_iv0LK6rujPpicqk6uuUaE
SSL Mode: Require
```

Then import the CSV files in this order:
1. users.csv → users table
2. sender.csv → sender table
3. regions.csv → regions table
4. property_types.csv → property_types table
5. categories.csv → categories table
6. purposes.csv → purposes table
7. messages.csv → messages table

## Step 4: Update Vercel

1. Go to: https://vercel.com/dashboard
2. Your project → Settings → Environment Variables
3. ADD: `POSTGRES_URL` = `postgres://823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1:sk_iv0LK6rujPpicqk6uuUaE@db.prisma.io:5432/postgres?sslmode=require`
4. DELETE: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
5. Save → Vercel will redeploy

## Done!

Your application will now use Prisma database!
