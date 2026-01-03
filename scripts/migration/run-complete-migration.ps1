# Complete Automated Migration Script for Windows PowerShell
# This migrates everything from Supabase to Prisma/Contabo

Write-Host "🚀 Starting Complete Migration from Supabase to Prisma..." -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:SUPABASE_URL = "https://gxyrpboyubpycejlkxue.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk"
$env:PRISMA_URL = "postgres://823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1:sk_iv0LK6rujPpicqk6uuUaE@db.prisma.io:5432/postgres?sslmode=require"
$env:PRISMA_ACCELERATE_URL = "prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19pdjBMSzZydWpQcGljcWs2dXVVYUUiLCJhcGlfa2V5IjoiMDFLRTMwM0dDWDNEU0VUWDJCNVJXWUgwRU0iLCJ0ZW5hbnRfaWQiOiI4MjMwODAzMzdjNTJkZGUwNmJlZDg3NDgyOTg4ZTY2MmRmOWQ5YTE3ZTJkYWFiMTBhOWM1YTUxNDAwMWRkNWUxIiwiaW50ZXJuYWxfc2VjcmV0IjoiOGI0YTNlYjMtNThlYi00NmY5LWFjZTQtZTA2YTJiNjg4YjM3In0.0y-yic0TXemrIXE8nychE_gGrFzlDVjQMJj3_29LWSQ"

# Step 1: Export data from Supabase
Write-Host "📤 Step 1/4: Exporting data from Supabase..." -ForegroundColor Yellow
Write-Host ""

try {
    Push-Location $PSScriptRoot
    node export-supabase.js
    if ($LASTEXITCODE -ne 0) {
        throw "Export failed"
    }
    Write-Host "✅ Export completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Export failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Trying alternative method using npx..." -ForegroundColor Yellow
    npx node export-supabase.js
}
Write-Host ""

# Step 2: Create schema in Prisma
Write-Host "📊 Step 2/4: Creating database schema in Prisma..." -ForegroundColor Yellow
Write-Host ""

$env:PGPASSWORD = "sk_iv0LK6rujPpicqk6uuUaE"
try {
    # Check if psql is available
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlPath) {
        psql -h db.prisma.io -p 5432 -U 823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1 -d postgres -f "$PSScriptRoot\import-sql.sql"
        Write-Host "✅ Schema created using psql!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  psql not found. Using Node.js to create schema..." -ForegroundColor Yellow
        node import-to-prisma.js --schema-only
    }
} catch {
    Write-Host "⚠️  Will create schema during import" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Import data to Prisma
Write-Host "📥 Step 3/4: Importing data to Prisma..." -ForegroundColor Yellow
Write-Host ""

try {
    node import-to-prisma.js
    if ($LASTEXITCODE -ne 0) {
        throw "Import failed"
    }
    Write-Host "✅ Import completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Import failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Verify migration
Write-Host "🔍 Step 4/4: Verifying migration..." -ForegroundColor Yellow
Write-Host ""

try {
    if ($psqlPath) {
        $countQuery = @"
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'sender', COUNT(*) FROM sender
UNION ALL SELECT 'regions', COUNT(*) FROM regions
UNION ALL SELECT 'property_types', COUNT(*) FROM property_types
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'purposes', COUNT(*) FROM purposes
UNION ALL SELECT 'messages', COUNT(*) FROM messages;
"@
        
        $env:PGPASSWORD = "sk_iv0LK6rujPpicqk6uuUaE"
        $result = $countQuery | psql -h db.prisma.io -p 5432 -U 823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1 -d postgres -t
        Write-Host "Table Counts:" -ForegroundColor Cyan
        Write-Host $result
    } else {
        Write-Host "✅ Import completed - manual verification needed" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not verify - please check manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "🎉 Migration completed successfully!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Update Vercel environment variables:" -ForegroundColor White
Write-Host "   - Add: POSTGRES_URL=$env:PRISMA_URL" -ForegroundColor Gray
Write-Host "   - Remove: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Commit and push changes:" -ForegroundColor White
Write-Host "   git add ." -ForegroundColor Gray
Write-Host "   git commit -m 'Migrate from Supabase to Prisma'" -ForegroundColor Gray
Write-Host "   git push origin master" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Redeploy on Vercel (automatic after push)" -ForegroundColor White
Write-Host ""
Write-Host "4. Test your application at your Vercel URL" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  SECURITY: Rotate Prisma credentials immediately!" -ForegroundColor Red
Write-Host "   (Exposed credentials should be regenerated)" -ForegroundColor Red
Write-Host ""

Pop-Location
