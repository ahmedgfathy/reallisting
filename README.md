# Real Estate Listing App - SQLite Version

A real estate listing application using React frontend and Node.js/Express backend with SQLite database.

## Features

- User registration and authentication
- Browse real estate listings with filters
- Admin dashboard for user management
- Message management system
- Region-based filtering
- Responsive design with PWA support

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. The SQLite database will be automatically created in the `data/` folder on first run.

## Development

Run both frontend and backend together:
```bash
npm run dev
```

Or run them separately:

Frontend (React):
```bash
npm start
```

Backend (Express API):
```bash
npm run server
```

The frontend will run on `http://localhost:3000` and the backend API on `http://localhost:5001`.

## Production Build

Build the React app:
```bash
npm run build
```

Run the production server:
```bash
NODE_ENV=production npm run server
```

## Project Structure

```
reallisting/
├── api/              # API route handlers
│   ├── auth.js       # Authentication endpoints
│   ├── messages.js   # Messages endpoints
│   ├── admin.js      # Admin endpoints
│   ├── regions.js    # Regions endpoints
│   ├── stats.js      # Statistics endpoints
│   └── profile.js    # User profile endpoints
├── data/             # SQLite database location (auto-created)
├── lib/              # Backend libraries
│   └── sqlite.js     # SQLite database module
├── public/           # Static files
├── src/              # React frontend source
│   ├── App.js        # Main app component
│   ├── Login.js      # Login component
│   ├── Register.js   # Registration component
│   ├── AdminDashboard.js  # Admin panel
│   └── apiConfig.js  # API configuration
├── server.js         # Express server
└── package.json      # Dependencies

```

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Verify JWT token
- `GET /api/messages` - Get messages (with filters)
- `GET /api/admin/users` - Get all users (admin only)
- `POST /api/admin/:userId/status` - Update user status (admin only)
- `DELETE /api/admin/messages` - Delete messages (admin only)
- `GET /api/regions` - Get all regions
- `GET /api/stats` - Get statistics
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

## Default Admin

To create an admin user, you need to manually update the database after registering:

```sql
UPDATE users SET role = 'admin', is_active = 1 WHERE mobile = 'YOUR_MOBILE_NUMBER';
```

## Environment Variables

See `.env` file for configuration options:
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 5001)
- `NODE_ENV` - Environment (development/production)

## License

MIT
