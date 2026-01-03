# 🚀 Quick Migration Steps

## What I've Created for You:

✅ **Export script**: `scripts/migration/export-supabase.js`
✅ **Import script**: `scripts/migration/import-to-prisma.js`
✅ **New database layer**: `lib/database.js` (PostgreSQL instead of Supabase)
✅ **Updated API**: `api/messages-postgres.js` (example)
✅ **Migration guide**: `scripts/migration/MIGRATION-GUIDE.md`

## Run Migration Now:

### Step 1: Export from Supabase

```bash
# Set your current Supabase credentials
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-key"

# Run export
node scripts/migration/export-supabase.js
```

### Step 2: Import to Prisma

```bash
# Set Prisma database URL
export POSTGRES_URL="postgres://f11e710b7d986b219e49bb8beefa7da1e98c3ed708b6af5ed1bbad609adb6b30:sk_9m1HEldAF6Mb8n96eN0wN@db.prisma.io:5432/postgres?sslmode=require"

# Install pg package first
npm install pg

# Run import
node scripts/migration/import-to-prisma.js
```

### Step 3: Update Vercel

1. Go to **Vercel Dashboard** → **Settings** → **Environment Variables**

2. **Add new variable:**
   ```
   POSTGRES_URL=postgres://f11e710b7d986b219e49bb8beefa7da1e98c3ed708b6af5ed1bbad609adb6b30:sk_9m1HEldAF6Mb8n96eN0wN@db.prisma.io:5432/postgres?sslmode=require
   ```

3. **Remove (after testing):**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. **Push code and redeploy:**
   ```bash
   git push origin master
   ```

## ⚠️ IMPORTANT SECURITY NOTE

The database credentials you shared are now in this chat. **After migration:**

1. Go to Prisma dashboard
2. Rotate/regenerate your database credentials
3. Update Vercel with new credentials
4. Test your application

## What's Different:

- **Before**: Supabase (storage quota exceeded)
- **After**: Direct PostgreSQL on Prisma/Contabo (no storage limits)
- **Same**: All your data, users, messages, everything migrated
- **Bonus**: No more storage quota errors! 🎉

## Need Help?

Check `scripts/migration/MIGRATION-GUIDE.md` for detailed documentation.
