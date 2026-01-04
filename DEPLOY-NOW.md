# Quick Start: Deploy to Appwrite

## 🎯 You Need:
1. **API Key** from Appwrite Console

## 🚀 Run This:

### Windows:
```cmd
set APPWRITE_API_KEY=your-api-key-here
scripts\deploy-appwrite.bat
```

### Mac/Linux:
```bash
export APPWRITE_API_KEY="your-api-key-here"
chmod +x scripts/deploy-appwrite.sh
./scripts/deploy-appwrite.sh
```

## 📝 Get API Key:
1. Visit: https://cloud.appwrite.io/console/project-694ba83300116af11b75/settings/keys
2. Click "Create API Key"
3. Name: `reallisting-deploy`
4. Permissions: **Select All**
5. Copy the key

## 📦 What Happens:
1. ✅ Installs Appwrite SDK
2. ✅ Creates database & collections
3. ✅ Builds React app
4. ✅ Prepares for deployment

## 🌐 Final Deployment Options:

### Option 1: Netlify (Easiest)
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### Option 2: Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option 3: Manual
- Upload `build/` folder to any static host
- Deploy `api/*-appwrite.js` as serverless functions

## ⚙️ Environment Variables to Set in Your Host:

```
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=694ba83300116af11b75
APPWRITE_API_KEY=your-api-key
APPWRITE_DATABASE_ID=reallisting
REACT_APP_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
REACT_APP_APPWRITE_PROJECT_ID=694ba83300116af11b75
REACT_APP_APPWRITE_DATABASE_ID=reallisting
```

## 📖 Full Guide:
See [APPWRITE-DEPLOYMENT.md](APPWRITE-DEPLOYMENT.md) for detailed instructions.

---
**Your Project:** https://cloud.appwrite.io/console/project-694ba83300116af11b75
