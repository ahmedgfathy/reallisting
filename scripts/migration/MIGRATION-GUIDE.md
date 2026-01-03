# Database Migration Guide: Supabase → Prisma/Contabo

## Prerequisites

1. **Install pg package:**
   ```bash
   npm install pg
   ```

2. **Set environment variables for export:**
   ```bash
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

3. **Set environment variables for import:**
   ```bash
   export POSTGRES_URL="postgres://f11e710b7d986b219e49bb8beefa7da1e98c3ed708b6af5ed1bbad609adb6b30:sk_9m1HEldAF6Mb8n96eN0wN@db.prisma.io:5432/postgres?sslmode=require"
   ```

## Migration Steps

### Option 1: Automated (Recommended)

Run the migration script:

```bash
chmod +x scripts/migration/migrate.sh
./scripts/migration/migrate.sh
```

### Option 2: Manual

**Step 1: Export from Supabase**

```bash
node scripts/migration/export-supabase.js
```

This will create `scripts/migration/supabase-export/` with all your data.

**Step 2: Import to Prisma Database**

```bash
node scripts/migration/import-to-prisma.js
```

This will:
- Create all tables and indexes
- Import all data
- Create the `messages_with_sender` view

## Update Vercel Configuration

After successful migration:

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. **Remove old variables:**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **Add new variable:**
   ```
   Name: POSTGRES_URL
   Value: postgres://f11e710b7d986b219e49bb8beefa7da1e98c3ed708b6af5ed1bbad609adb6b30:sk_9m1HEldAF6Mb8n96eN0wN@db.prisma.io:5432/postgres?sslmode=require
   ```
   
   OR
   
   ```
   Name: PRISMA_DATABASE_URL
   Value: prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza185bTFIRWxkQUY2TWI4bjk2ZU4wd04iLCJhcGlfa2V5IjoiMDFLRTJYMjg2NzhZME4yRUhGVFhZOTJaUEciLCJ0ZW5hbnRfaWQiOiJmMTFlNzEwYjdkOTg2YjIxOWU0OWJiOGJlZWZhN2RhMWU5OGMzZWQ3MDhiNmFmNWVkMWJiYWQ2MDlhZGI2YjMwIiwiaW50ZXJuYWxfc2VjcmV0IjoiNDNjYmEyOWEtOTNmNC00MTgzLWJhMWYtZmNkZWZlMTBlOGY4In0.NX7-3RO9YJHQpoq-GNq267i9pfJSeui6QUA3FatVYtQ
   ```

4. **Keep:**
   - `JWT_SECRET=reallisting_secret_key_2025_secure`

5. **Redeploy** your application

## Verification

Test your API endpoints after deployment:

```bash
curl https://your-app.vercel.app/api/stats
curl https://your-app.vercel.app/api/regions
```

## Rollback (if needed)

If something goes wrong:

1. Re-add Supabase environment variables in Vercel
2. Redeploy
3. Your Supabase data remains untouched

## Data Migrated

- ✅ users (authentication)
- ✅ sender (message senders)
- ✅ regions
- ✅ property_types
- ✅ categories
- ✅ purposes
- ✅ messages (all listings)
- ✅ messages_with_sender view

## ⚠️ Security Note

**IMPORTANT:** The database credentials you shared are now publicly visible. After migration:

1. Rotate your database credentials in Prisma dashboard
2. Update Vercel with new credentials
3. Never commit credentials to git
