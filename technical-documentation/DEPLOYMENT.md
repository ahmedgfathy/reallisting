# Deployment Guide

## Supabase Setup

1. Create or open your Supabase project.
2. Open the SQL editor.
3. Run [`supabase-schema.sql`](/c:/Users/ahmed/Downloads/reallisting/technical-documentation/supabase-schema.sql).
4. If needed, run [`create-admin.sql`](/c:/Users/ahmed/Downloads/reallisting/technical-documentation/create-admin.sql) or use [`scripts/seed-admin.js`](/c:/Users/ahmed/Downloads/reallisting/scripts/seed-admin.js).

## Required Environment Variables

Set these locally in `.env` and in your hosting provider for production:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
JWT_SECRET=your-jwt-secret
REACT_APP_API_URL=https://your-app-domain.example
ALLOWED_ORIGINS=https://your-app-domain.example,http://localhost:3000
```

Optional aliases supported by the backend:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## How the App Selects the Database

- If `SUPABASE_URL` and one supported Supabase key are present, [`lib/db.js`](/c:/Users/ahmed/Downloads/reallisting/lib/db.js) loads the Supabase adapter.
- If they are missing, the app falls back to the local JSON database in [`lib/database.js`](/c:/Users/ahmed/Downloads/reallisting/lib/database.js).

## Local Development

Install dependencies:

```bash
npm install
```

Run the backend and frontend separately:

```bash
npm run server
npm start
```

Or run both together:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:5001`

## Production Build

```bash
npm run build
```

If you deploy to Vercel, [`vercel.json`](/c:/Users/ahmed/Downloads/reallisting/vercel.json) already routes `/api/*` requests to [`api/index.js`](/c:/Users/ahmed/Downloads/reallisting/api/index.js).

## Security Notes

- Do not commit real Supabase keys into the repository.
- Prefer `SUPABASE_SERVICE_ROLE_KEY` only for server-side operations.
- Rotate any credential that was previously written into docs or chat history.
