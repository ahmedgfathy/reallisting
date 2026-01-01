#!/bin/bash

REMOTE_HOST="app.glomartrealestates.com"
REMOTE_USER="root"
REMOTE_PASS='ZeroCall20!@HH##1655&&'

echo "🔍 Step 3: Getting table structures..."

sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'

# Get structure of properties table in real_estate_crm
echo "=== real_estate_crm.properties_property ==="
mysql -u root -p'ZeroCall20!@HH##1655&&' real_estate_crm -e "DESCRIBE properties_property;" 2>/dev/null

echo ""
echo "=== glomart_data.properties ==="
mysql -u root -p'ZeroCall20!@HH##1655&&' glomart_data -e "DESCRIBE properties;" 2>/dev/null

echo ""
echo "=== glomart_data.properties_images ==="
mysql -u root -p'ZeroCall20!@HH##1655&&' glomart_data -e "DESCRIBE properties_images;" 2>/dev/null

echo ""
echo "=== glomart_data.properties_videos ==="
mysql -u root -p'ZeroCall20!@HH##1655&&' glomart_data -e "DESCRIBE properties_videos;" 2>/dev/null

echo ""
echo "=== Sample data from glomart_data.properties ==="
mysql -u root -p'ZeroCall20!@HH##1655&&' glomart_data -e "SELECT * FROM properties LIMIT 2\G" 2>/dev/null

ENDSSH

echo ""
echo "✓ Structure retrieved!"
