# Direct Database Migration Using psql

## Prerequisites

Install PostgreSQL client (psql):
```bash
# Ubuntu/WSL
sudo apt-get install postgresql-client

# Windows (install from https://www.postgresql.org/download/windows/)
```

## Step 1: Create Schema in Prisma Database

Run this command from your project root:

```bash
PGPASSWORD="sk_ptt4DoygGQuSZ9nwYfVJg" psql \
  -h db.prisma.io \
  -p 5432 \
  -U 823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1 \
  -d postgres \
  -f scripts/migration/import-sql.sql
```

Or on Windows PowerShell:
```powershell
$env:PGPASSWORD="sk_ptt4DoygGQuSZ9nwYfVJg"
psql -h db.prisma.io -p 5432 -U 823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1 -d postgres -f scripts/migration/import-sql.sql
```

## Step 2: Export Data from Supabase

### Option A: Using Supabase Dashboard

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run each query and download as CSV:

```sql
-- Export users
\copy (SELECT * FROM users) TO '/tmp/users.csv' CSV HEADER;

-- Export sender  
\copy (SELECT * FROM sender) TO '/tmp/sender.csv' CSV HEADER;

-- Export reference tables
\copy (SELECT * FROM regions) TO '/tmp/regions.csv' CSV HEADER;
\copy (SELECT * FROM property_types) TO '/tmp/property_types.csv' CSV HEADER;
\copy (SELECT * FROM categories) TO '/tmp/categories.csv' CSV HEADER;
\copy (SELECT * FROM purposes) TO '/tmp/purposes.csv' CSV HEADER;

-- Export messages
\copy (SELECT * FROM messages) TO '/tmp/messages.csv' CSV HEADER;
```

### Option B: Using psql (if you have Supabase direct access)

```bash
# Replace with your Supabase credentials
SUPABASE_URL="your-supabase-url"
SUPABASE_KEY="your-key"

# Export all tables
pg_dump -h your-supabase-host -U postgres -d postgres --data-only --table=users --table=sender --table=regions --table=property_types --table=categories --table=purposes --table=messages > export.sql
```

## Step 3: Import Data to Prisma

### Using CSV files:

```bash
PGPASSWORD="sk_ptt4DoygGQuSZ9nwYfVJg" psql \
  -h db.prisma.io \
  -p 5432 \
  -U 823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1 \
  -d postgres \
  -c "\copy users FROM '/tmp/users.csv' CSV HEADER"

PGPASSWORD="sk_ptt4DoygGQuSZ9nwYfVJg" psql \
  -h db.prisma.io \
  -p 5432 \
  -U 823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1 \
  -d postgres \
  -c "\copy sender FROM '/tmp/sender.csv' CSV HEADER"

# Repeat for other tables...
```

### Using SQL dump:

```bash
PGPASSWORD="sk_ptt4DoygGQuSZ9nwYfVJg" psql \
  -h db.prisma.io \
  -p 5432 \
  -U 823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1 \
  -d postgres \
  -f export.sql
```

## Step 4: Verify Data

```bash
PGPASSWORD="sk_ptt4DoygGQuSZ9nwYfVJg" psql \
  -h db.prisma.io \
  -p 5432 \
  -U 823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1 \
  -d postgres \
  -c "SELECT 'users' as table_name, COUNT(*) FROM users UNION ALL SELECT 'messages', COUNT(*) FROM messages;"
```

## Step 5: Update Vercel

Add environment variable in Vercel:

```
POSTGRES_URL=postgres://823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1:sk_ptt4DoygGQuSZ9nwYfVJg@db.prisma.io:5432/postgres?sslmode=require
```

Remove:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

## Step 6: Deploy

```bash
git push origin master
```

## ⚠️ Security Note

**After migration, rotate your Prisma credentials immediately!**
The credentials in this file are exposed and should be regenerated.
