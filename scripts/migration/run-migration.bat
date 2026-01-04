@echo off
REM Complete Automated Migration Script for Windows
REM This migrates everything from Supabase to Prisma

echo.
echo ========================================
echo    Complete Database Migration
echo    Supabase -^> Prisma/Contabo
echo ========================================
echo.

REM Set environment variables
set SUPABASE_URL=https://gxyrpboyubpycejlkxue.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk
set PRISMA_URL=postgres://823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1:sk_iv0LK6rujPpicqk6uuUaE@db.prisma.io:5432/postgres?sslmode=require

REM Step 1: Export data from Supabase
echo [1/4] Exporting data from Supabase...
echo.
cd %~dp0
node export-supabase.js
if errorlevel 1 (
    echo ERROR: Export failed!
    pause
    exit /b 1
)
echo.
echo ✓ Export completed successfully!
echo.

REM Step 2 & 3: Create schema and import data to Prisma
echo [2/4] Creating schema and importing data to Prisma...
echo.
node import-to-prisma.js
if errorlevel 1 (
    echo ERROR: Import failed!
    pause
    exit /b 1
)
echo.
echo ✓ Import completed successfully!
echo.

REM Step 4: Verify
echo [3/4] Verifying migration...
echo.
echo Migration files created. Please verify manually using:
echo   psql or a PostgreSQL client
echo.

REM Final steps
echo ========================================
echo   Migration Completed Successfully!
echo ========================================
echo.
echo NEXT STEPS:
echo.
echo 1. Update Vercel Environment Variables:
echo    - Go to: https://vercel.com/your-project/settings/environment-variables
echo    - ADD: POSTGRES_URL = %PRISMA_URL%
echo    - REMOVE: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
echo.
echo 2. Commit and push changes:
echo    git add .
echo    git commit -m "Migrate from Supabase to Prisma"
echo    git push origin master
echo.
echo 3. Vercel will automatically redeploy
echo.
echo 4. Test your application at your Vercel URL
echo.
echo WARNING: Rotate Prisma credentials immediately!
echo          ^(Exposed credentials should be regenerated^)
echo.
pause
