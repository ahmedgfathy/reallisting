@echo off
echo Starting Appwrite MCP Server...
echo.

cd mcp

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Load environment variables from parent .env
set APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
set APPWRITE_PROJECT_ID=694ba83300116af11b75
set APPWRITE_API_KEY=standard_dddcbecc3efa79f7e5038592a1190d74ad8ac626ad9a1e3d4d9ca499b1bd558036c0639c146d6f1477139c5001dcce0f70f60e2a30277bd32f2d15bb4aec6064ad9501828776ebaa6299b1a78ad4498cca15a1929a89dcf1c2122fdaccd5f5f5730c87fe3331b007e3be57bb2784498aa8d79c62a1f65171f93c73bf46df27f2
set APPWRITE_DATABASE_ID=695a84140031c5a93745

echo MCP Server starting with configuration:
echo   Endpoint: %APPWRITE_ENDPOINT%
echo   Project: %APPWRITE_PROJECT_ID%
echo   Database: %APPWRITE_DATABASE_ID%
echo.

node mcp-server.js
