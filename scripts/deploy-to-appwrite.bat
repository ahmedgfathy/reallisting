@echo off
echo ========================================
echo   Deploy to Appwrite Cloud
echo ========================================
echo.

set PROJECT_ID=694ba83300116af11b75
set ENDPOINT=https://fra.cloud.appwrite.io/v1

REM Step 1: Setup database
echo [1/4] Setting up Appwrite database...
node scripts\setup-appwrite-db.js
if errorlevel 1 (
    echo [ERROR] Database setup failed
    pause
    exit /b 1
)
echo [OK] Database ready
echo.

REM Step 2: Build app
echo [2/4] Building React app...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [OK] Build complete
echo.

REM Step 3: Install Appwrite CLI
echo [3/4] Installing Appwrite CLI...
where appwrite >nul 2>nul
if errorlevel 1 (
    echo Installing Appwrite CLI globally...
    call npm install -g appwrite-cli
)
echo [OK] Appwrite CLI ready
echo.

REM Step 4: Instructions for deployment
echo [4/4] Deployment Instructions
echo.
echo ========================================
echo   Manual Steps Required
echo ========================================
echo.
echo Your app is built and ready in the 'build' folder!
echo.
echo To deploy to Appwrite:
echo.
echo 1. Create Storage Bucket for Static Files:
echo    - Go to: https://cloud.appwrite.io/console/project-%PROJECT_ID%/storage
echo    - Click "Create bucket"
echo    - Name: website
echo    - Make it PUBLIC (enable file security: Any)
echo    - Maximum file size: 50MB
echo.
echo 2. Upload Static Files:
echo    - Open the bucket
echo    - Click "Upload files"
echo    - Select ALL files from the 'build' folder
echo    - Upload them (keep folder structure)
echo.
echo 3. Deploy Functions:
echo    Run: appwrite login
echo    Then: appwrite init
echo    Project ID: %PROJECT_ID%
echo    Then run: node scripts\deploy-functions.js
echo.
echo 4. Get Your Website URL:
echo    - Each file will have a URL
echo    - Main URL: https://cloud.appwrite.io/v1/storage/buckets/[BUCKET_ID]/files/[FILE_ID]/view
echo    - Or use Appwrite's hosting when available
echo.
echo ========================================
echo.
pause
