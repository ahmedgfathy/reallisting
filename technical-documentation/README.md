# Technical Documentation

This folder contains the current setup and deployment references for the RealListing app.

## Current Stack

- Frontend: React
- API: Node.js / Express-compatible handlers in [`api/`](/c:/Users/ahmed/Downloads/reallisting/api)
- Local development server: [`server.js`](/c:/Users/ahmed/Downloads/reallisting/server.js)
- Database selection: [`lib/db.js`](/c:/Users/ahmed/Downloads/reallisting/lib/db.js)
- Production database: Supabase
- Local fallback database: JSON file created by [`lib/database.js`](/c:/Users/ahmed/Downloads/reallisting/lib/database.js)

## Main References

- Setup and deployment: [`DEPLOYMENT.md`](/c:/Users/ahmed/Downloads/reallisting/technical-documentation/DEPLOYMENT.md)
- Default admin accounts: [`ADMIN-CREDENTIALS.md`](/c:/Users/ahmed/Downloads/reallisting/technical-documentation/ADMIN-CREDENTIALS.md)
- Supabase schema: [`supabase-schema.sql`](/c:/Users/ahmed/Downloads/reallisting/technical-documentation/supabase-schema.sql)
- Optional admin seed SQL: [`create-admin.sql`](/c:/Users/ahmed/Downloads/reallisting/technical-documentation/create-admin.sql)

## Notes

- Secrets are intentionally not stored in documentation.
- The app switches to Supabase automatically when `SUPABASE_URL` plus a supported key are set.
- If Supabase variables are absent, the app falls back to the local JSON database for development.
