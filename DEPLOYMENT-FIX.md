# Fix 401 Unauthorized Error - Deployment Guide

## Problem
Your frontend is at `https://www.contaboo.com/` but it's trying to call APIs on the same domain, which doesn't have the API backend.

## Solution: Configure API URL

### Step 1: Find Your Vercel API URL
1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Find your project deployment URL (e.g., `https://reallisting-xyz123.vercel.app`)

### Step 2: Add Environment Variable in Vercel

1. Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

2. Add this variable:
   ```
   Name: REACT_APP_API_URL
   Value: https://your-vercel-project.vercel.app
   ```
   (Replace with your actual Vercel URL)

3. **Important:** Select all environments (Production, Preview, Development)

### Step 3: Add CORS Environment Variable (Optional)

If you want tighter security, add:
```
Name: ALLOWED_ORIGINS  
Value: https://www.contaboo.com,http://localhost:3000
```

### Step 4: Add Supabase Environment Variables

Make sure these are set in Vercel:
```
SUPABASE_URL=https://vpjcplyjlxrctsicldfv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
JWT_SECRET=your-jwt-secret
```

Get these from: https://supabase.com/dashboard/project/vpjcplyjlxrctsicldfv/settings/api

### Step 5: Redeploy

1. In Vercel dashboard, go to **Deployments**
2. Find your latest deployment
3. Click the **⋮** menu → **Redeploy**
4. Wait for deployment to complete

### Step 6: Test

Visit: `https://www.contaboo.com/`

The API calls should now go to your Vercel backend instead of trying to call the same domain.

---

## Alternative: Deploy Everything on Vercel

If you want simpler setup:

1. Deploy both frontend and backend to Vercel (already done)
2. In Vercel dashboard: **Settings → Domains**
3. Add your custom domain: `www.contaboo.com`
4. Point your DNS to Vercel (they'll show you the records)
5. No need for REACT_APP_API_URL - it will use relative URLs

This way, both frontend and API are on the same domain automatically.
