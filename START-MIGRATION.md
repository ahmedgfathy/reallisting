# 🚀 COMPLETE MIGRATION INSTRUCTIONS

Since Node.js in WSL has issues, please follow these **MANUAL STEPS**:

## ⚡ Quick Start (5 minutes)

### Prerequisites
You need Node.js installed on **Windows** (not WSL). 
Download from: https://nodejs.org/

### Step 1: Open Windows PowerShell or Command Prompt

Press `Win + R`, type `powershell`, press Enter.

### Step 2: Navigate to project

```powershell
cd C:\Users\ahmed\Downloads\reallisting\scripts\migration
```

### Step 3: Set environment variables

```powershell
$env:SUPABASE_URL = "https://gxyrpboyubpycejlkxue.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk"
```

### Step 4: Run migration

```powershell
# Export from Supabase
node export-supabase.js

# Import to Prisma
node import-to-prisma.js
```

### Step 5: Update Vercel

1. Go to: https://vercel.com/dashboard
2. Click your project → Settings → Environment Variables
3. **ADD** new variable:
   - Name: `POSTGRES_URL`
   - Value: `postgres://823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1:sk_ptt4DoygGQuSZ9nwYfVJg@db.prisma.io:5432/postgres?sslmode=require`
   - Environments: Production, Preview, Development

4. **DELETE** these variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

5. Click **Save**

### Step 6: Deploy

Your Vercel deployment will automatically redeploy with new database!

---

## 📝 Alternative: Double-Click Method

If you prefer the simplest way:

1. Open Windows File Explorer
2. Navigate to: `C:\Users\ahmed\Downloads\reallisting\scripts\migration\`
3. Double-click `run-migration.bat`
4. Follow the on-screen instructions

---

## 🔍 Verify Migration

After migration, you can verify by checking table counts:

```powershell
# If you have PostgreSQL client installed
$env:PGPASSWORD="sk_ptt4DoygGQuSZ9nwYfVJg"
psql -h db.prisma.io -p 5432 -U 823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1 -d postgres -c "SELECT 'messages' as table_name, COUNT(*) FROM messages;"
```

---

## ⚠️ IMPORTANT SECURITY NOTICE

After successful migration, you **MUST** rotate these credentials:

1. Go to Prisma Dashboard
2. Regenerate database password
3. Update `POSTGRES_URL` in Vercel with new credentials
4. Delete old credentials

These credentials have been exposed in this conversation and should not be used long-term!

---

## ❓ Troubleshooting

### "Node.js is not recognized"
- Install Node.js from https://nodejs.org/
- Restart PowerShell after installation

### "Module not found: @supabase/supabase-js"
- Run in project root: `npm install`

### "@supabase/supabase-js module not found" in migration script
- Run: `cd ../.. && npm install && cd scripts/migration`

### Import fails
- Check internet connection
- Verify Prisma URL is correct
- Try running schema creation separately

---

## 📞 Need Help?

If you encounter issues:
1. Copy the error message
2. Check the logs in `scripts/migration/export-*.json` files
3. Verify database connection with a simple SELECT query

**The migration should take 2-5 minutes depending on data size.**
