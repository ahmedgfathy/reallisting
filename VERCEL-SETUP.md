# Vercel Deployment Setup

## ⚠️ Required Environment Variables

Your API connection error is caused by missing environment variables in Vercel. Follow these steps:

### 1. Get Supabase Credentials

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Settings** → **API**
3. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **service_role key** (⚠️ NOT the anon key!)

### 2. Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:

```
Variable Name: SUPABASE_URL
Value: [paste your Project URL here]

Variable Name: SUPABASE_SERVICE_ROLE_KEY
Value: [paste your service_role key here]

Variable Name: JWT_SECRET
Value: reallisting_secret_key_2025_secure
```

4. Make sure to select **All** environments (Production, Preview, Development)

### 3. Redeploy

After adding the variables:
1. Go to **Deployments** tab
2. Find your latest deployment
3. Click the **⋯** menu → **Redeploy**
4. ✅ Your app should now work!

## 🔍 Troubleshooting

If you still see errors after redeploying:

1. **Check Vercel Function Logs:**
   - Deployments → Your deployment → Functions tab
   - Look for error messages

2. **Verify Supabase is Active:**
   - Make sure your Supabase project isn't paused
   - Check if the database tables exist: `users`, `messages`, `regions`, `sender`

3. **Test API Endpoints:**
   - Visit: `https://your-app.vercel.app/api/stats`
   - Should return JSON with stats (or clear error message)

## 📝 Notes

- This project is configured for Vercel + Supabase only
- No local .env files needed
- All configuration happens in Vercel dashboard
