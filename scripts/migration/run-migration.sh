#!/bin/bash

# Complete Automated Migration Script
# This script migrates data from Supabase to Prisma/Contabo

set -e  # Exit on error

echo "🚀 Starting Complete Migration from Supabase to Prisma..."
echo ""

# Step 1: First, create the schema in Prisma database
echo "📊 Step 1: Creating database schema in Prisma..."
echo ""

# Use psql to connect and create schema
PGPASSWORD="sk_ptt4DoygGQuSZ9nwYfVJg" psql \
  -h db.prisma.io \
  -p 5432 \
  -U 823080337c52dde06bed87482988e662df9d9a17e2daab10a9c5a514001dd5e1 \
  -d postgres \
  -f scripts/migration/import-sql.sql

echo "✅ Schema created successfully!"
echo ""

# Step 2: You'll need to manually export and import the data
echo "📤 Step 2: Data Export/Import"
echo ""
echo "Since automated data migration requires Node.js, please follow these steps:"
echo ""
echo "1. Go to Supabase Dashboard → SQL Editor"
echo "2. Run these queries and save results:"
echo "   - SELECT * FROM users;"
echo "   - SELECT * FROM sender;"  
echo "   - SELECT * FROM regions;"
echo "   - SELECT * FROM property_types;"
echo "   - SELECT * FROM categories;"
echo "   - SELECT * FROM purposes;"
echo "   - SELECT * FROM messages;"
echo ""
echo "3. Import the data using psql or a PostgreSQL client"
echo ""

read -p "Press Enter when data is imported, or Ctrl+C to stop..."

echo ""
echo "🎉 Migration process completed!"
echo ""
echo "Next steps:"
echo "1. Update Vercel environment variables"
echo "2. Push code and redeploy"
echo "3. Test your application"
