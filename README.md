# Reallisting - Real Estate Platform

Modern real estate listing platform built with React and Supabase.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
./scripts/start.sh
# or
npm start

# Build for production
npm run build
```

## 📁 Project Structure

```
reallisting/
├── api/                           # Serverless API endpoints
│   ├── clean-mobiles-cron.js     # Automated mobile number cleaning
│   └── ...
├── src/                           # React application source
├── public/                        # Static assets
├── scripts/                       # Utility scripts
│   ├── start.sh                  # Development server startup
│   ├── data-cleaning/            # Contact info cleaning scripts
│   │   ├── clean-mobile-numbers-fast.js
│   │   ├── clean-contact-info-enhanced.js
│   │   └── ...
│   ├── database-scripts/         # Database schema & migrations
│   ├── generate-icons.js         # Icon generation
│   └── archive/                  # Legacy migration scripts
├── docs/                          # Documentation
│   └── technical/                # Technical documentation
└── build/                        # Production build output
```

## 🗂️ Documentation

- [Implementation Summary](docs/technical/IMPLEMENTATION_SUMMARY.md)
- [Contact Info Cleaning](docs/technical/CONTACT_CLEANING_README.md)
- [Password Reset Feature](docs/technical/PASSWORD_RESET_IMPLEMENTATION.md)
- [WhatsApp Import Guide](docs/technical/WHATSAPP_IMPORT_GUIDE.md) 📥 NEW
- [WhatsApp Import Quick Start](docs/WHATSAPP_IMPORT_README.md) 📥 NEW

## 🛠️ Tech Stack

- **Frontend**: React, CSS
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
JWT_SECRET=your_jwt_secret
ADMIN_PASSWORD=your_admin_password
```

## 📦 Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## 🌐 Deployment

The app is configured for Vercel deployment. Push to the `glomart` branch to deploy.

## 📝 License

Private - All rights reserved
