# Admin User Credentials

## Super Admin Account (Primary)

**Username (mobile)**: `admin`  
**Password**: `Admin@2025`  
**Role**: Admin  
**Status**: Active ✅

## Fallback Admin Account

**Username (mobile)**: `xinreal`  
**Password**: `zerocall`  
**Role**: Admin  
**Status**: Active ✅

---

## Login URL

- **Production (Vercel)**: `https://your-app-name.vercel.app` → click **تسجيل الدخول** (Login)
- **Local development**: http://localhost:3000

---

## Admin Privileges

With these accounts you can:
- ✅ View all messages with full contact information
- ✅ Access Admin Dashboard
- ✅ Manage users (activate / deactivate)
- ✅ View user statistics
- ✅ Full CRUD operations on all data
- ✅ Import WhatsApp chat groups

---

## Setting Up Supabase (First-Time Setup)

### Step 1 – Create Tables

Run the SQL in `supabase-schema.sql` via the [Supabase SQL Editor](https://app.supabase.com):
```
supabase-schema.sql
```
This creates all tables, indexes, RLS policies, default regions, **and** the admin users above.

### Step 2 – (Alternative) Seed Admin Users Programmatically

If you need to re-insert or update admin users without re-running the full schema:
```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
node scripts/seed-admin.js
```

### Step 3 – Configure Vercel Environment Variables

In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://your-project-ref.supabase.co` |
| `SUPABASE_ANON_KEY` | your anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key *(optional but recommended)* |
| `REACT_APP_API_URL` | `https://your-vercel-app.vercel.app` |

---

## Quick API Test

```bash
# Login via API (replace URL with your Vercel deployment)
curl -X POST https://your-vercel-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@2025"}'
```

Expected response:
```json
{
  "success": true,
  "token": "...",
  "user": {
    "username": "admin",
    "role": "admin",
    "isActive": true
  }
}
```

---

## Password Hash Details

Passwords are hashed with **SHA-256**:
```
hash = SHA256(password + JWT_SECRET)
```
where `JWT_SECRET` defaults to `reallisting_secret_key_2025_secure`  
(override with the `JWT_SECRET` environment variable).

| Username | Password | SHA-256 Hash |
|----------|----------|--------------|
| admin | Admin@2025 | `40c670f136bb7575f05c71bbc271f140d618e1f5896efb47aec739a1edab6ea7` |
| xinreal | zerocall | `b1033538c309334e491175cde9272538619a848bbe233b0568c1660dbddc1229` |

---

**Status**: ✅ Admin accounts created and verified!

