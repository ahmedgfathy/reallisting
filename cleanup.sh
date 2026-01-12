#!/bin/bash

# Cleanup script to remove MariaDB files and install Supabase dependencies

echo "🧹 Cleaning up MariaDB files..."

# Remove MariaDB library file
if [ -f "lib/mariadb.js" ]; then
    rm lib/mariadb.js
    echo "  ✅ Removed lib/mariadb.js"
fi

# Remove SQLite library file (if exists)
if [ -f "lib/sqlite.js" ]; then
    rm lib/sqlite.js
    echo "  ✅ Removed lib/sqlite.js"
fi

# Remove data directory (SQLite database files)
if [ -d "data" ]; then
    rm -rf data
    echo "  ✅ Removed data/ directory"
fi

# Remove migration scripts
if [ -d "scripts" ]; then
    echo "  ℹ️  Keeping scripts/ directory (might be useful for reference)"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Run the SQL schema in Supabase SQL Editor (see supabase-schema.sql)"
echo "2. Initialize sample data: node init-db.js"
echo "3. Start the server: npm run dev"
echo ""
