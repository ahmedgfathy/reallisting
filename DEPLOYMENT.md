# Real Estate Listing App - Supabase + Vercel Version

## 🚀 Quick Deployment Guide

### 1. **Setup Supabase Database**

1. Go to your Supabase project: https://vpjcplyjlxrctsicldfv.supabase.co
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-schema.sql`
4. Click **Run** to create all tables and indexes

### 2. **Deploy to Vercel**

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: Using Git + Vercel Dashboard
1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Add environment variables (see below)
5. Deploy

### 3. **Environment Variables for Vercel**

Add these in Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://vpjcplyjlxrctsicldfv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwamNwbHlqbHhyY3RzaWNsZGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzM3NTksImV4cCI6MjA4MzgwOTc1OX0.TnN5C8PyXK1wVA3ldu3jcxUYlXotKr6mwj9wyiiEx68
SUPABASE_URL=https://vpjcplyjlxrctsicldfv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwamNwbHlqbHhyY3RzaWNsZGZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMzc1OSwiZXhwIjoyMDgzODA5NzU5fQ.E9KQ97PLhXb_e5JNhxl-7B17L1APChLRYZLIM0xLAw4
SUPABASE_JWT_SECRET=JlzOVfzM8SrmEW1m9MikqojHHosuYxpGiVnQ+DAOUeQDlg80tO4glTMt2CsI2RYVNeXWXTFsuk7e4SmK2ydLSA==
JWT_SECRET=reallisting_secret_key_2025_secure
```

## 🧪 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database (First Time Only)
```bash
# Run the Supabase SQL schema first (in Supabase SQL Editor)
# Then initialize with sample data:
node init-db.js
```

### 3. Start Development Server

**Option A: Run both frontend and backend**
```bash
npm run dev
```

**Option B: Run separately**

Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
npm start
```

### 4. Access the Application
- Frontend: http://localhost:3000
- API: http://localhost:5001

## 🔑 Default Credentials

**Admin Account:**
- Mobile: 0500000000
- Password: admin123

**Test Broker:**
- Mobile: 0500000001
- Password: broker123

## 📦 Project Structure

```
reallisting/
├── api/                    # API route handlers
│   ├── auth.js            # Authentication
│   ├── messages.js        # Messages CRUD
│   ├── admin.js           # Admin operations
│   ├── regions.js         # Regions list
│   ├── stats.js           # Statistics
│   └── profile.js         # User profile
├── lib/
│   └── supabase.js        # Supabase client & database logic
├── src/                   # React frontend
├── public/                # Static assets
├── server.js             # Express server
├── init-db.js           # Database initialization
├── supabase-schema.sql  # Database schema
├── vercel.json          # Vercel configuration
└── .env                 # Environment variables
```

## 🗄️ Database

- **Platform:** Supabase (PostgreSQL)
- **Tables:** users, messages, regions
- **Connection:** Automatic via environment variables

## 🌐 API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Verify JWT token
- `GET /api/messages` - Get messages (with filters)
- `GET /api/admin/users` - Get all users (admin)
- `POST /api/admin/:userId/status` - Update user status (admin)
- `DELETE /api/admin/messages` - Delete messages (admin)
- `GET /api/regions` - Get all regions
- `GET /api/stats` - Get statistics
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

## 🔧 Troubleshooting

### Database Connection Issues
- Verify Supabase credentials in `.env`
- Check that tables are created (run `supabase-schema.sql`)
- Ensure RLS policies are configured correctly

### Vercel Deployment Issues
- Verify all environment variables are set in Vercel
- Check build logs for errors
- Ensure `vercel.json` is properly configured

### Port Already in Use
```bash
# Change port in .env
PORT=5002 npm run server
```

## 📝 Migration from Supabase

This project has been migrated from Supabase to Supabase PostgreSQL:
- ✅ Removed Supabase2 dependency
- ✅ Added @supabase/supabase-js
- ✅ Updated all API endpoints
- ✅ Created Supabase schema
- ✅ Configured for Vercel deployment

## 🔒 Security Notes

- Never commit `.env` file to git
- Use environment variables in Vercel for production
- Service role key should only be used server-side
- RLS policies protect data access

## 📄 License

MIT
