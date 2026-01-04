# 🚀 Complete Migration & Deployment to Appwrite

## Step-by-Step Guide

### ✅ Step 1: Setup Appwrite Database

Run this command to create database structure:

```cmd
node scripts\setup-appwrite-db.js
```

**Expected Output:**
```
✅ Database created: reallisting
✅ Users collection created
✅ Messages collection created  
✅ Regions collection created
```

---

### ✅ Step 2: Migrate Your Data from PostgreSQL

Make sure your PostgreSQL connection is in `.env`:

```cmd
node scripts\migrate-to-appwrite.js
```

**This will migrate:**
- 👥 All users (with roles and activation status)
- 💬 All messages/listings (with all properties)
- 🗺️  All regions (with counts)

**Expected Output:**
```
📊 Summary:
   Users:    X/X migrated
   Messages: X/X migrated
   Regions:  X/X migrated
✨ Your data is now in Appwrite!
```

---

### ✅ Step 3: Build Your React App

```cmd
npm run build
```

This creates the `build/` folder with production-ready files.

---

### ✅ Step 4: Deploy to Appwrite

#### Option A: Use Netlify (Easiest - Recommended!)

```cmd
npm install -g netlify-cli
netlify login
netlify init
```

**Configure in Netlify Dashboard:**
- Build command: `npm run build`
- Publish directory: `build`
- Functions directory: `api`

**Add Environment Variables:**
```
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=694ba83300116af11b75
APPWRITE_API_KEY=standard_69d1026b0dd5de2b14b4e75b2feb8e0ae12038f3be60510adc0f4b2184c07401f62a32498d273efa99cffbd968e35668cd3b954cf4cef5289b5a56e34f3a33c8ae2fd93df0d2c6a35a845ec6773ce2afd0ac614e21c3ae6e7d8b0bb91edceda9fcac6e804ec1844d93a4c4f5b7b101f248892389e046417392fa3d605d358658
APPWRITE_DATABASE_ID=reallisting
REACT_APP_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
REACT_APP_APPWRITE_PROJECT_ID=694ba83300116af11b75
REACT_APP_APPWRITE_DATABASE_ID=reallisting
```

**Deploy:**
```cmd
netlify deploy --prod
```

---

#### Option B: Use Appwrite Storage + Functions

1. **Create Storage Bucket:**
```cmd
node scripts\deploy-functions.js
```

2. **Upload Static Files:**
   - Go to: https://cloud.appwrite.io/console/project-694ba83300116af11b75/storage
   - Open the "website" bucket
   - Upload ALL files from `build/` folder

3. **Deploy Functions:**
   - Go to: https://cloud.appwrite.io/console/project-694ba83300116af11b75/functions
   - For each function (auth, messages, admin, stats, regions):
     - Click "Create Function"
     - Name: (function name)
     - Runtime: Node.js 18
     - Click "Deploy" → Upload code
     - Upload: `api/*-appwrite.js` + `lib/appwrite.js` + `package.json` + `node_modules/`

---

## 📋 Verification Checklist

After deployment, verify:

- [ ] Database has data
  - Go to: https://cloud.appwrite.io/console/project-694ba83300116af11b75/databases/database-reallisting
  - Check users, messages, regions collections have data

- [ ] Website loads
  - Visit your deployed URL
  - Should see the homepage

- [ ] Login works
  - Try logging in with existing user

- [ ] Messages/Listings display
  - Should see all migrated listings

- [ ] Filters work
  - Test category, region, property type filters

- [ ] Admin dashboard (if admin user)
  - Access user management

---

## 🔧 Troubleshooting

### Migration Issues:

**"PostgreSQL connection failed"**
- Check POSTGRES_URL in `.env` file
- Verify database is accessible

**"Some records failed to migrate"**
- This is normal, script will continue
- Check console for specific errors
- Re-run script to retry failed records

### Deployment Issues:

**"CORS errors"**
- Add your domain in Appwrite Console
- Settings → Platforms → Add Web Platform
- Enter your deployment URL

**"API calls failing"**
- Verify environment variables are set correctly
- Check API key has all permissions
- Verify functions are deployed

**"No data showing"**
- Confirm migration completed successfully
- Check Appwrite Console → Database
- Verify collections have documents

---

## 🎯 Quick Commands Summary

```cmd
# 1. Setup database structure
node scripts\setup-appwrite-db.js

# 2. Migrate all data
node scripts\migrate-to-appwrite.js

# 3. Build app
npm run build

# 4. Deploy (Netlify)
netlify deploy --prod

# OR Deploy (Vercel)
vercel --prod
```

---

## 📞 Support

- **Project Console:** https://cloud.appwrite.io/console/project-694ba83300116af11b75
- **Database:** https://cloud.appwrite.io/console/project-694ba83300116af11b75/databases/database-reallisting
- **Appwrite Docs:** https://appwrite.io/docs

---

**Status:** 🟢 **Ready to Migrate & Deploy!**
