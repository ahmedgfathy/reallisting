-- Migration: Normalize repeated attributes into isolated tables
-- This creates lookup tables for variable attributes and links them to messages

-- 1. Create Regions Table
CREATE TABLE IF NOT EXISTS regions (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Populate Regions
INSERT INTO regions (name)
SELECT DISTINCT region FROM messages 
WHERE region IS NOT NULL AND region != '' 
ON CONFLICT (name) DO NOTHING;

-- 2. Create Property Types Table
CREATE TABLE IF NOT EXISTS property_types (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Populate Property Types
INSERT INTO property_types (name)
SELECT DISTINCT property_type FROM messages 
WHERE property_type IS NOT NULL AND property_type != '' 
ON CONFLICT (name) DO NOTHING;

-- 3. Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Populate Categories
INSERT INTO categories (name)
SELECT DISTINCT category FROM messages 
WHERE category IS NOT NULL AND category != '' 
ON CONFLICT (name) DO NOTHING;

-- 4. Create Purposes Table
CREATE TABLE IF NOT EXISTS purposes (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Populate Purposes
INSERT INTO purposes (name)
SELECT DISTINCT purpose FROM messages 
WHERE purpose IS NOT NULL AND purpose != '' 
ON CONFLICT (name) DO NOTHING;

-- 5. Add Foreign Keys to Messages Table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS region_id INTEGER REFERENCES regions(id),
ADD COLUMN IF NOT EXISTS property_type_id INTEGER REFERENCES property_types(id),
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS purpose_id INTEGER REFERENCES purposes(id);

-- 6. Update Messages with IDs
UPDATE messages m
SET region_id = r.id
FROM regions r
WHERE m.region = r.name;

UPDATE messages m
SET property_type_id = pt.id
FROM property_types pt
WHERE m.property_type = pt.name;

UPDATE messages m
SET category_id = c.id
FROM categories c
WHERE m.category = c.name;

UPDATE messages m
SET purpose_id = p.id
FROM purposes p
WHERE m.purpose = p.name;

-- 7. Create Indexes
CREATE INDEX IF NOT EXISTS idx_messages_region_id ON messages(region_id);
CREATE INDEX IF NOT EXISTS idx_messages_property_type_id ON messages(property_type_id);
CREATE INDEX IF NOT EXISTS idx_messages_category_id ON messages(category_id);
CREATE INDEX IF NOT EXISTS idx_messages_purpose_id ON messages(purpose_id);

-- 8. Enable RLS on new tables
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE purposes ENABLE ROW LEVEL SECURITY;

-- 9. Create public read policies
CREATE POLICY "Allow public read regions" ON regions FOR SELECT USING (true);
CREATE POLICY "Allow public read property_types" ON property_types FOR SELECT USING (true);
CREATE POLICY "Allow public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow public read purposes" ON purposes FOR SELECT USING (true);

-- Summary
SELECT 
  (SELECT COUNT(*) FROM regions) as regions_count,
  (SELECT COUNT(*) FROM property_types) as types_count,
  (SELECT COUNT(*) FROM categories) as categories_count,
  (SELECT COUNT(*) FROM purposes) as purposes_count;
