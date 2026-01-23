# 🏠 Real Listing Application - Quick Start

## ✅ Fixed: Backend is now working with MariaDB!

The 500 error has been resolved. The messages API was calling the wrong function name.

## 🚀 How to Run

### Option 1: Using the Start Script (Recommended)

```bash
cd /mnt/d/github-work/reallisting
./start.sh
```

This will:
- ✅ Check MySQL/MariaDB connection
- ✅ Stop any existing servers
- ✅ Start backend on port 5001
- ✅ Start frontend on port 3000
- ✅ Open browser automatically

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd /mnt/d/github-work/reallisting
node server.js
```

**Terminal 2 - Frontend:**
```bash
cd /mnt/d/github-work/reallisting
npm start
```

### Stop Servers

```bash
./stop.sh
```

Or manually:
```bash
pkill -f "node server.js"
pkill -f "react-scripts start"
```

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **API Health**: http://localhost:5001/

## 📊 What's Fixed

### Before (Error):
```
Failed to load resource: the server responded with a status of 500
Messages error: TypeError: messages.get is not a function
```

### After (Working):
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 0,
    "totalPages": 0
  },
  "hasMore": false
}
```

## ✅ Working Endpoints

All API endpoints are now functional:

- ✅ `GET /api/messages` - List messages (with filters)
- ✅ `POST /api/messages` - Create message
- ✅ `GET /api/regions` - Get regions (11 regions loaded)
- ✅ `GET /api/stats` - Get statistics
- ✅ `POST /api/auth/login` - User login
- ✅ `POST /api/auth/register` - User registration
- ✅ `GET /api/profile` - User profile
- ✅ `GET /api/admin/users` - Admin dashboard

## 🗄️ Database

- **Host**: localhost
- **Database**: reallisting
- **User**: root
- **Password**: zerocall
- **Tables**: users, messages, regions

## 📝 View Logs

```bash
# Backend logs
tail -f /mnt/d/github-work/reallisting/server.log

# Frontend logs
tail -f /mnt/d/github-work/reallisting/react.log
```

## 🧪 Test Connection

```bash
./test-connection.sh
```

## 💡 Features Now Available

1. **User Registration/Login** - Create accounts and authenticate
2. **Message Management** - CRUD operations for real estate listings
3. **Region Filtering** - 11 Arabic regions available
4. **Admin Dashboard** - User management for admins
5. **Search & Filters** - Category, type, region, purpose filters
6. **WhatsApp Import** - Import listings from WhatsApp
7. **Mobile Masking** - Phone numbers hidden for non-approved users

## 🎨 Frontend

The React app will:
- Auto-reload when you save changes
- Show compilation errors in the browser
- Connect to `http://localhost:5001` for API calls

## 🔧 Troubleshooting

### Backend not starting?
```bash
# Check if port 5001 is in use
lsof -i :5001
# Kill the process if needed
kill -9 <PID>
```

### Frontend not loading?
```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill the process if needed
kill -9 <PID>
```

### Database connection error?
```bash
# Test MySQL connection
mysql -u root -pzerocall -e "USE reallisting; SHOW TABLES;"
```

## 📦 Dependencies Installed

- ✅ `mysql2` - MySQL client for Node.js
- ✅ `express` - Web framework
- ✅ `react` - Frontend framework
- ✅ `cors` - CORS middleware

---

**Status**: 🎉 All systems operational! Both frontend and backend are working correctly.
