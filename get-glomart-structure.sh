#!/bin/bash

REMOTE_HOST="app.glomartrealestates.com"
REMOTE_USER="root"
REMOTE_PASS='ZeroCall20!@HH##1655&&'

echo "🔍 Getting complete glomart_data structure..."

sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'

echo "=== properties table ==="
mysql -u root -p'ZeroCall20!@HH##1655&&' glomart_data -e "SHOW CREATE TABLE properties\G" 2>/dev/null

echo ""
echo "=== properties_images table ==="
mysql -u root -p'ZeroCall20!@HH##1655&&' glomart_data -e "SHOW CREATE TABLE properties_images\G" 2>/dev/null

echo ""
echo "=== properties_videos table ==="
mysql -u root -p'ZeroCall20!@HH##1655&&' glomart_data -e "SHOW CREATE TABLE properties_videos\G" 2>/dev/null

echo ""
echo "=== projects table ==="
mysql -u root -p'ZeroCall20!@HH##1655&&' glomart_data -e "SHOW CREATE TABLE projects\G" 2>/dev/null

echo ""
echo "=== Sample property with images ==="
mysql -u root -p'ZeroCall20!@HH##1655&&' glomart_data -e "
SELECT p.*, 
       (SELECT GROUP_CONCAT(image_url) FROM properties_images WHERE property_id = p.id LIMIT 3) as images,
       (SELECT GROUP_CONCAT(video_url) FROM properties_videos WHERE property_id = p.id LIMIT 2) as videos
FROM properties p LIMIT 1\G
" 2>/dev/null

ENDSSH

echo ""
echo "✓ Complete structure retrieved!"
