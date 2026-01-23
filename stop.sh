#!/bin/bash
# Stop all servers

echo "🛑 Stopping Real Listing Application..."
echo ""

echo "Stopping Backend Server..."
pkill -f "node server.js"
echo "✅ Backend stopped"

echo "Stopping Frontend Server..."
pkill -f "react-scripts start"
echo "✅ Frontend stopped"

echo ""
echo "✅ All servers stopped successfully"
