# Admin Credentials

## Default Admin Accounts

The local JSON fallback and the Supabase seed flow use these admin accounts by default:

- `admin` / `Admin@2025`
- `xinreal` / `zerocall`

## How They Are Seeded

- Local fallback database: created automatically by [`lib/database.js`](/c:/Users/ahmed/Downloads/reallisting/lib/database.js)
- Supabase: seeded by [`scripts/seed-admin.js`](/c:/Users/ahmed/Downloads/reallisting/scripts/seed-admin.js) or by running [`technical-documentation/supabase-schema.sql`](/c:/Users/ahmed/Downloads/reallisting/technical-documentation/supabase-schema.sql)

## Recommended Production Practice

- Change the default admin passwords after first login.
- Set a strong `JWT_SECRET`.
- Prefer `SUPABASE_SERVICE_ROLE_KEY` only on the server side.
- Do not commit real credentials into repo files.
