# Local Development

## Current Runtime Flow

- React app: [`src/`](/c:/Users/ahmed/Downloads/reallisting/src)
- API handlers: [`api/`](/c:/Users/ahmed/Downloads/reallisting/api)
- Local Express wrapper: [`server.js`](/c:/Users/ahmed/Downloads/reallisting/server.js)
- Database switch: [`lib/db.js`](/c:/Users/ahmed/Downloads/reallisting/lib/db.js)

## Commands

Install dependencies:

```bash
npm install
```

Start backend:

```bash
npm run server
```

Start frontend:

```bash
npm start
```

Start both:

```bash
npm run dev
```

## Environment

Copy `.env.example` to `.env` and fill in your own values.

If you set Supabase credentials, the app uses Supabase automatically.
If you do not set them, the app uses the local JSON fallback database.
