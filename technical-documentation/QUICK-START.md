# Quick Start Guide

## ✅ Migration Complete!

All Appwrite, Vercel, Supabase, and Prisma dependencies have been removed.
Your app now uses **Supabase** for local database storage.

## 🚀 Getting Started

### 1. Initialize the Database
```bash
node init-db.js
```
This creates:
- Sample regions
- Admin user (mobile: 0500000000, password: admin123)
- Test broker user (mobile: 0500000001, password: broker123)

### 2. Start the Application

**Option A: Run both frontend and backend together**
```bash
npm run dev
```

**Option B: Run separately**

Terminal 1 - Backend API:
```bash
npm run server
```

Terminal 2 - Frontend React:
```bash
npm start
```

### 3. Access the Application

- Frontend: http://localhost:3000
- API Server: http://localhost:5001

## 📁 Project Structure

```
reallisting/
├── data/                  # Supabase database file (auto-created)
├── lib/
│   └── Supabase.js         # Supabase database module
├── api/                  # API route handlers
│   ├── auth.js          # Authentication
│   ├── messages.js      # Messages CRUD
│   ├── admin.js         # Admin operations
│   ├── regions.js       # Regions list
│   ├── stats.js         # Statistics
│   └── profile.js       # User profile
├── src/                 # React frontend
│   └── apiConfig.js    # API configuration
├── server.js           # Express server
└── init-db.js         # Database initialization script
```

## 🔑 Default Credentials

**Admin Account:**
- Mobile: 0500000000
- Password: admin123
- Access: Full admin dashboard

**Test Broker:**
- Mobile: 0500000001
- Password: broker123
- Note: Needs admin approval

## 💾 Database Location

Supabase database file: `data/reallisting.db`

## ⚙️ Environment Variables

Edit `.env` file:
```
JWT_SECRET=your_secret_key
PORT=5001
NODE_ENV=development
```

## 🛠️ Troubleshooting

**Port already in use?**
Change PORT in .env file or:
```bash
PORT=5002 npm run server
```

**Database issues?**
Delete and recreate:
```bash
del data\reallisting.db
node init-db.js
```

## 📝 Notes

- All data is stored locally in Supabase
- No internet connection required after npm install
- Database file is in data/ folder
- sql.js is pure JavaScript (no compilation needed)
