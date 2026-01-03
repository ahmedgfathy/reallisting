#!/bin/bash
# Get exact table structures from remote MariaDB

TABLES=(
  "countries"
  "currencies"
  "regions"
  "property_types"
  "property_categories"
  "property_purposes"
  "property_statuses"
  "finishing_levels"
  "unit_facilities"
  "filtersettings"
  "properties"
  "properties_images"
  "properties_videos"
)

for table in "${TABLES[@]}"; do
  echo "=== $table ==="
  sshpass -p 'ZeroCall20!@HH##1655&&' ssh -o StrictHostKeyChecking=no root@app.glomartrealestates.com \
    "mysql -u root -p'ZeroCall20!@HH##1655&&' glomart_data -e 'SHOW CREATE TABLE $table\\G'" | grep -A 1000 "Create Table"
  echo ""
done
