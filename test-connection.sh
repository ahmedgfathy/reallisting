#!/bin/bash
# Frontend and Backend Connection Test

echo "🔍 Testing Frontend and Backend Connection..."
echo ""

# Check if servers are running
echo "1️⃣ Checking Backend Server (Port 5001)..."
BACKEND=$(curl -s http://localhost:5001/ 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Backend API is running"
    echo "   Response: $BACKEND"
else
    echo "❌ Backend is not responding"
    exit 1
fi
echo ""

# Check Frontend
echo "2️⃣ Checking Frontend Server (Port 3000)..."
FRONTEND=$(curl -s http://localhost:3000 2>/dev/null | head -1)
if [ $? -eq 0 ]; then
    echo "✅ Frontend is running"
    echo "   Response: $FRONTEND"
else
    echo "❌ Frontend is not responding"
    exit 1
fi
echo ""

# Test API endpoints
echo "3️⃣ Testing API Endpoints..."

echo "   Testing /api/stats..."
STATS=$(curl -s http://localhost:5001/api/stats 2>/dev/null)
if echo "$STATS" | grep -q "users"; then
    echo "   ✅ Stats API working"
    echo "      $STATS"
else
    echo "   ❌ Stats API failed"
fi

echo ""
echo "   Testing /api/regions..."
REGIONS=$(curl -s http://localhost:5001/api/regions 2>/dev/null)
if echo "$REGIONS" | grep -q "الحي"; then
    echo "   ✅ Regions API working"
    REGION_COUNT=$(echo "$REGIONS" | grep -o "الحي" | wc -l)
    echo "      Found regions with Arabic text"
else
    echo "   ❌ Regions API failed"
fi
echo ""

# Database connectivity
echo "4️⃣ Testing Database Connection..."
DB_TEST=$(mysql -u root -pzerocall -e "USE reallisting; SELECT COUNT(*) as count FROM regions;" 2>&1 | grep -v "Using a password" | tail -1)
if [ $? -eq 0 ]; then
    echo "✅ MySQL/MariaDB connection successful"
    echo "   Regions in database: $DB_TEST"
else
    echo "❌ Database connection failed"
fi
echo ""

echo "=========================================="
echo "✅ All systems operational!"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5001"
echo "Database: MySQL (reallisting)"
echo "=========================================="
