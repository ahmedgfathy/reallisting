#!/bin/bash

echo "🚀 Starting migration from Supabase to Prisma/Contabo..."
echo ""

# Check if node_modules/pg exists
if [ ! -d "node_modules/pg" ]; then
  echo "📦 Installing pg package..."
  npm install pg
fi

# Step 1: Export from Supabase
echo "📤 Step 1: Exporting data from Supabase..."
echo "Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set"
echo ""
node scripts/migration/export-supabase.js

if [ $? -ne 0 ]; then
  echo "❌ Export failed. Please check your Supabase credentials."
  exit 1
fi

echo ""
echo "✅ Export completed!"
echo ""

# Step 2: Import to Prisma
echo "📥 Step 2: Importing data to Prisma/Contabo database..."
echo "Make sure PRISMA_DATABASE_URL or POSTGRES_URL is set"
echo ""
node scripts/migration/import-to-prisma.js

if [ $? -ne 0 ]; then
  echo "❌ Import failed. Please check your Prisma database credentials."
  exit 1
fi

echo ""
echo "🎉 Migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update Vercel environment variables:"
echo "   - Remove: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
echo "   - Add: PRISMA_DATABASE_URL or POSTGRES_URL"
echo "2. Redeploy your application"
echo ""
