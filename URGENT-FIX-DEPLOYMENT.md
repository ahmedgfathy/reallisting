# ❗ URGENT: Fix 401 & 413 Errors

## 🔴 THE PROBLEM

Your website is at `https://www.contaboo.com/` but **the API is NOT there**. 

When the frontend tries to call:
- `https://www.contaboo.com/api/auth?path=verify` → **404/401 (API doesn't exist at this URL)**
- `https://www.contaboo.com/api/import-whatsapp` → **404/413 (API doesn't exist at this URL)**

Your API is actually hosted on **Vercel** at a different URL!

---

## ✅ SOLUTION

You have 2 options:

### Option 1: Move Everything to Vercel (RECOMMENDED)

**This is the simplest solution:**

1. **Find your Vercel project URL:**
   - Go to: https://vercel.com/dashboard
   - Find your project (probably named "reallisting" or similar)
   - Copy the deployment URL (e.g., `https://reallisting-abc123.vercel.app`)

2. **Point your domain to Vercel:**
   - In Vercel dashboard: Go to **Settings → Domains**
   - Click **Add Domain**
   - Enter: `www.contaboo.com`
   - Vercel will show you DNS records to add
   
3. **Update your DNS at your domain registrar:**
   - Add the DNS records Vercel provides
   - Wait 10-60 minutes for DNS to propagate

4. **Done!** Both frontend and API will be at `www.contaboo.com`

---

### Option 2: Keep Frontend on Contaboo, Point API to Vercel

**If you want to keep hosting at Contaboo:**

1. **Find your Vercel API URL:**
   - Go to: https://vercel.com/dashboard
   - Find your deployment URL (e.g., `https://reallisting-abc123.vercel.app`)

2. **Add environment variable in Vercel:**
   - Go to: **Settings → Environment Variables**
   - Click **Add New**
   - Name: `REACT_APP_API_URL`
   - Value: `https://your-vercel-project.vercel.app` (use your actual URL)
   - Check: **Production**, **Preview**, **Development**
   - Click **Save**

3. **Add these environment variables too (if not already added):**
   ```
   SUPABASE_URL=https://vpjcplyjlxrctsicldfv.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=(get from Supabase dashboard)
   SUPABASE_JWT_SECRET=(get from Supabase dashboard)
   JWT_SECRET=(same as SUPABASE_JWT_SECRET)
   ALLOWED_ORIGINS=https://www.contaboo.com,http://localhost:3000
   ```

4. **Get Supabase keys:**
   - Go to: https://supabase.com/dashboard/project/vpjcplyjlxrctsicldfv/settings/api
   - Copy `service_role` key and JWT secret

5. **Redeploy on Vercel:**
   - Go to **Deployments** tab
   - Click latest deployment → **⋮** menu → **Redeploy**

6. **Rebuild and upload to Contaboo:**
   ```bash
   cd /home/xinreal/reallisting
   npm run build
   ```
   Then upload the `build/` folder to your Contaboo server

---

## 🔍 How to Find Your Vercel URL

If you don't know your Vercel URL:

1. Open terminal and run:
   ```bash
   cd /home/xinreal/reallisting
   git remote -v
   ```

2. Look for a URL like:
   - `https://github.com/username/reallisting.git`
   - Or `https://vercel.com/username/reallisting`

3. If you see a GitHub URL, go to:
   - GitHub → Your repository → Environments (or Deployments)
   - Find the Vercel deployment link

4. Or just log in to https://vercel.com/dashboard and find your project

---

## 📝 Quick Check

After making changes, test these URLs:

1. **API Health Check:**
   Visit: `https://your-vercel-url.vercel.app/api`
   
   Should show: `{"status":"ok","message":"API is running",...}`

2. **Auth Check:**
   Visit: `https://your-vercel-url.vercel.app/api/auth?path=verify`
   
   Should show: `{"authenticated":false}` (this is correct without a token)

3. **Frontend:**
   Visit: `https://www.contaboo.com/`
   
   Should load without 401 errors in console

---

## ⚠️ Important Notes

- The code changes I made are ready and will work once you configure the URLs correctly
- The issue is NOT in the code - it's that the frontend doesn't know where the API is
- **Option 1 (move to Vercel) is much simpler** - I strongly recommend it
- If you choose Option 2, make sure to rebuild and re-upload to Contaboo after every code change

---

## 🆘 Still Having Issues?

Let me know:
1. Which option you chose (1 or 2)
2. Your Vercel deployment URL
3. Any error messages you're still seeing
