#!/bin/bash

# Remote server credentials
REMOTE_HOST="app.glomartrealestates.com"
REMOTE_USER="root"
REMOTE_PASS='ZeroCall20!@HH##1655&&'
DB_USER="root"
DB_PASS='ZeroCall20!@HH##1655&&'

echo "🔍 Step 1: Discovering database structure..."

# Connect via SSH and explore databases
sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'

# Show all databases
echo "=== Available Databases ==="
mysql -u root -p'ZeroCall20!@HH##1655&&' -e "SHOW DATABASES;"

# Find the properties database (likely name)
echo ""
echo "=== Searching for properties database ==="
mysql -u root -p'ZeroCall20!@HH##1655&&' -e "SHOW DATABASES;" | grep -iE "(property|properties|estate|real|glomar)"

ENDSSH

echo ""
echo "✓ Discovery complete!"
