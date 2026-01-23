#!/bin/bash
# Start both Frontend and Backend servers

echo "🚀 Starting Real Listing Application..."
echo ""

# Check if MySQL is running
echo "1️⃣ Checking MySQL/MariaDB..."
if mysql -u root -pzerocall -e "USE reallisting;" 2>/dev/null; then
    echo "   ✅ Database is accessible"
else
    echo "   ❌ Database is not accessible!"
    echo "   Please start MySQL/MariaDB first"
    exit 1
fi
echo ""

# Kill any existing processes
echo "2️⃣ Stopping existing servers..."
pkill -f "node server.js" 2>/dev/null
pkill -f "react-scripts start" 2>/dev/null
sleep 2
echo "   ✅ Cleared existing processes"
echo ""

# Start backend
echo "3️⃣ Starting Backend Server (Port 5001)..."
cd /mnt/d/github-work/reallisting
nohup node server.js > server.log 2>&1 &
BACKEND_PID=$!
echo "   ✅ Backend started (PID: $BACKEND_PID)"
echo "   ⏳ Waiting for backend to initialize..."
sleep 5

# Check if backend is running with retries
RETRY_COUNT=0
MAX_RETRIES=5
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:5001/ > /dev/null 2>&1; then
        echo "   ✅ Backend is responding"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        sleep 2
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "   ❌ Backend failed to start"
    echo "   📋 Server logs:"
    cat server.log
    exit 1
fi
echo ""

# Start frontend
echo "4️⃣ Starting Frontend Server (Port 3000)..."
cd /mnt/d/github-work/reallisting
nohup npm start > react.log 2>&1 &
FRONTEND_PID=$!
echo "   ✅ Frontend started (PID: $FRONTEND_PID)"
echo "   ⏳ Waiting for React to compile (this may take 20-30 seconds)..."
sleep 20
echo ""

echo "=========================================="
echo "✅ Application Started Successfully!"
echo "=========================================="
echo ""
echo "📱 Frontend:  http://localhost:3000"
echo "🔌 Backend:   http://localhost:5001"
echo "🗄️  Database:  MySQL (reallisting)"
echo ""
echo "📋 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📝 View logs:"
echo "   Backend:  tail -f /mnt/d/github-work/reallisting/server.log"
echo "   Frontend: tail -f /mnt/d/github-work/reallisting/react.log"
echo ""
echo "🛑 Stop servers:"
echo "   pkill -f 'node server.js'"
echo "   pkill -f 'react-scripts start'"
echo "=========================================="
echo ""
echo "🌐 Opening browser in 5 seconds..."
sleep 5

# Try to open browser (works on WSL2 with Windows browser)
if command -v wslview &> /dev/null; then
    wslview http://localhost:3000
elif command -v explorer.exe &> /dev/null; then
    explorer.exe "http://localhost:3000"
else
    echo "Please open http://localhost:3000 in your browser"
fi
