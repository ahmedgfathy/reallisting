#!/bin/bash

REMOTE_HOST="app.glomartrealestates.com"
REMOTE_USER="root"
REMOTE_PASS='ZeroCall20!@HH##1655&&'

echo "🔍 Step 2: Exploring property databases..."

sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'

# Explore each property database
for DB in real_estate_crm glomart_crm glomart_data django_db_real_crm; do
  echo ""
  echo "=== Database: $DB ==="
  mysql -u root -p'ZeroCall20!@HH##1655&&' -e "USE $DB; SHOW TABLES;" 2>/dev/null | head -20
  
  # Count rows in each table
  echo ""
  echo "Table row counts:"
  mysql -u root -p'ZeroCall20!@HH##1655&&' "$DB" -e "
    SELECT table_name, table_rows 
    FROM information_schema.tables 
    WHERE table_schema='$DB' 
    ORDER BY table_rows DESC LIMIT 10;
  " 2>/dev/null
done

ENDSSH

echo ""
echo "✓ Exploration complete!"
