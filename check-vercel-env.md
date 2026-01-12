# Vercel Environment Variables Checklist

## Required Environment Variables for Vercel

You need to add these environment variables in your Vercel dashboard:

1. Go to: https://vercel.com/your-project/settings/environment-variables

2. Add the following variables (from your `.env` file):

### Database Variables
- `SUPABASE_URL` = https://vpjcplyjlxrctsicldfv.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY` = (your service role key from Supabase dashboard)
- `SUPABASE_JWT_SECRET` = (your JWT secret from Supabase dashboard)

### Authentication Variables
- `JWT_SECRET` = (same as SUPABASE_JWT_SECRET or use your own)

### Frontend Variables (optional but recommended)
- `NEXT_PUBLIC_SUPABASE_URL` = https://vpjcplyjlxrctsicldfv.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key from Supabase dashboard)

## How to Get Supabase Keys:

1. Go to: https://supabase.com/dashboard/project/vpjcplyjlxrctsicldfv/settings/api
2. Find:
   - `service_role` key (keep this secret!)
   - `anon` key (safe for frontend)
   - JWT secret (in Project Settings → API → JWT Settings)

## After Adding Variables:

1. Make sure to set them for **all environments** (Production, Preview, Development)
2. Redeploy your project: `git push` or manual redeploy from Vercel dashboard
3. Check logs at: https://vercel.com/your-project/deployments

## Quick Test:

After setting variables, visit your API endpoint:
https://your-project.vercel.app/api

Should return: `{"status":"ok","message":"API is running","timestamp":"..."}`
