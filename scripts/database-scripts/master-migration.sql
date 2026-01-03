-- MASTER MIGRATION SCRIPT (FIXED)
-- This script normalizes the database by:
-- 1. Extracting Sender info (Name, Mobile) to a 'sender' table
-- 2. Extracting Attributes (Region, Category, etc) to lookup tables
-- 3. Cleaning the 'messages' table by removing redundant columns
-- 4. Safe to run multiple times (Idempotent)

-- ==========================================
-- PART 1: SENDER EXTRACTION & ISOLATION
-- ==========================================

-- 1. Create sender table
CREATE TABLE IF NOT EXISTS sender (
  id SERIAL PRIMARY KEY,
  name TEXT,
  mobile TEXT UNIQUE NOT NULL,
  first_seen_date TEXT,
  first_seen_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.5 Ensure messages table has image_url (Fixing missing column error)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Add sender_id foreign key to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS sender_id INTEGER REFERENCES sender(id) ON DELETE SET NULL;

-- 3. Create helper function for mobile extraction
CREATE OR REPLACE FUNCTION extract_egyptian_mobile(text_content TEXT)
RETURNS TEXT AS $$
DECLARE
  mobile_match TEXT;
BEGIN
  mobile_match := (regexp_matches(text_content, '\y01[0-9]{9}\y'))[1];
  IF mobile_match IS NOT NULL THEN RETURN mobile_match; END IF;
  
  mobile_match := (regexp_matches(text_content, '\+201[0-9]{9}\y'))[1];
  IF mobile_match IS NOT NULL THEN RETURN substring(mobile_match from 3); END IF;
  
  mobile_match := (regexp_matches(text_content, '\y\d{11}\y'))[1];
  IF mobile_match IS NOT NULL AND left(mobile_match, 2) = '01' THEN RETURN mobile_match; END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Populate sender table from messages (Unique Mobiles) - DYNAMIC SQL to handle missing columns
DO $$
DECLARE
  has_mobile BOOLEAN;
  has_name BOOLEAN;
BEGIN
  -- Check if columns exist
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'mobile') INTO has_mobile;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'name') INTO has_name;

  IF has_mobile AND has_name THEN
    -- Scenario 1: Both columns exist (Old schema)
    INSERT INTO sender (mobile, name, first_seen_date, first_seen_time)
    SELECT DISTINCT ON (mobile_number)
      mobile_number,
      m.name,
      m.date_of_creation,
      split_part(m.date_of_creation, ' ', 2)
    FROM (
      SELECT id, name, date_of_creation,
        COALESCE(extract_egyptian_mobile(message), extract_egyptian_mobile(mobile)) as mobile_number
      FROM messages
      WHERE message IS NOT NULL OR mobile IS NOT NULL
    ) m
    WHERE m.mobile_number IS NOT NULL AND m.mobile_number NOT IN ('N/A', '') AND m.mobile_number ~ '^[0-9+]{10,15}$'
    ORDER BY mobile_number, date_of_creation
    ON CONFLICT (mobile) DO NOTHING;
    
  ELSIF has_mobile THEN
     -- Scenario 2: Only mobile exists (Rare)
    INSERT INTO sender (mobile, first_seen_date, first_seen_time)
    SELECT DISTINCT ON (mobile_number)
      mobile_number,
      m.date_of_creation,
      split_part(m.date_of_creation, ' ', 2)
    FROM (
      SELECT id, date_of_creation,
        COALESCE(extract_egyptian_mobile(message), extract_egyptian_mobile(mobile)) as mobile_number
      FROM messages
      WHERE message IS NOT NULL OR mobile IS NOT NULL
    ) m
    WHERE m.mobile_number IS NOT NULL AND m.mobile_number NOT IN ('N/A', '')
    ORDER BY mobile_number, date_of_creation
    ON CONFLICT (mobile) DO NOTHING;

  ELSE
    -- Scenario 3: Columns dropped, extract ONLY from message body
    INSERT INTO sender (mobile, first_seen_date, first_seen_time)
    SELECT DISTINCT ON (mobile_number)
      mobile_number,
      m.date_of_creation,
      split_part(m.date_of_creation, ' ', 2)
    FROM (
      SELECT id, date_of_creation,
        extract_egyptian_mobile(message) as mobile_number
      FROM messages
      WHERE message IS NOT NULL
    ) m
    WHERE m.mobile_number IS NOT NULL AND m.mobile_number NOT IN ('N/A', '')
    ORDER BY mobile_number, date_of_creation
    ON CONFLICT (mobile) DO NOTHING;
  END IF;
END $$;

-- 5. Link messages to sender table
DO $$
DECLARE
  has_mobile BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'mobile') INTO has_mobile;

  -- Verify consistency based on phone in message body
  UPDATE messages m
  SET sender_id = s.id
  FROM sender s
  WHERE extract_egyptian_mobile(m.message) = s.mobile AND m.sender_id IS NULL;

  -- If mobile column exists, use it too
  IF has_mobile THEN
    EXECUTE '
      UPDATE messages m
      SET sender_id = s.id
      FROM sender s
      WHERE m.mobile = s.mobile AND m.sender_id IS NULL
    ';
  END IF;
END $$;

-- 6. Clean mobile numbers from message content (Privacy)
UPDATE messages
SET message = regexp_replace(message, '\y01[0-9]{9}\y|\+201[0-9]{9}\y', '***', 'g')
WHERE sender_id IS NOT NULL AND message ~ '01[0-9]{9}|\\+201[0-9]{9}';


-- ==========================================
-- PART 2: ATTRIBUTE NORMALIZATION
-- ==========================================

-- 1. Create Lookup Tables
CREATE TABLE IF NOT EXISTS regions (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS property_types (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS purposes (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL);

-- 2. Populate Lookup Tables via Dynamic SQL (Safely check if columns exist)
DO $$
DECLARE
  has_region BOOLEAN;
  has_prop_type BOOLEAN;
  has_category BOOLEAN;
  has_purpose BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'region') INTO has_region;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'property_type') INTO has_prop_type;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'category') INTO has_category;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'purpose') INTO has_purpose;

  IF has_region THEN
    EXECUTE 'INSERT INTO regions (name) SELECT DISTINCT region FROM messages WHERE region IS NOT NULL AND region != '''' ON CONFLICT (name) DO NOTHING';
  END IF;
  
  IF has_prop_type THEN
    EXECUTE 'INSERT INTO property_types (name) SELECT DISTINCT property_type FROM messages WHERE property_type IS NOT NULL AND property_type != '''' ON CONFLICT (name) DO NOTHING';
  END IF;

  IF has_category THEN
    EXECUTE 'INSERT INTO categories (name) SELECT DISTINCT category FROM messages WHERE category IS NOT NULL AND category != '''' ON CONFLICT (name) DO NOTHING';
  END IF;

  IF has_purpose THEN
    EXECUTE 'INSERT INTO purposes (name) SELECT DISTINCT purpose FROM messages WHERE purpose IS NOT NULL AND purpose != '''' ON CONFLICT (name) DO NOTHING';
  END IF;
END $$;

-- 3. Add Foreign Keys
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS region_id INTEGER REFERENCES regions(id),
ADD COLUMN IF NOT EXISTS property_type_id INTEGER REFERENCES property_types(id),
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS purpose_id INTEGER REFERENCES purposes(id);

-- 4. Link Tables (Dynamic SQL)
DO $$
DECLARE
  has_region BOOLEAN;
  has_prop_type BOOLEAN;
  has_category BOOLEAN;
  has_purpose BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'region') INTO has_region;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'property_type') INTO has_prop_type;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'category') INTO has_category;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'purpose') INTO has_purpose;

  IF has_region THEN
    EXECUTE 'UPDATE messages m SET region_id = r.id FROM regions r WHERE m.region = r.name';
  END IF;

  IF has_prop_type THEN
    EXECUTE 'UPDATE messages m SET property_type_id = pt.id FROM property_types pt WHERE m.property_type = pt.name';
  END IF;

  IF has_category THEN
    EXECUTE 'UPDATE messages m SET category_id = c.id FROM categories c WHERE m.category = c.name';
  END IF;

  IF has_purpose THEN
    EXECUTE 'UPDATE messages m SET purpose_id = p.id FROM purposes p WHERE m.purpose = p.name';
  END IF;
END $$;


-- ==========================================
-- PART 3: CLEANUP & OPTIMIZATION
-- ==========================================

-- 1. Drop dependent view FIRST
DROP VIEW IF EXISTS messages_with_sender;

-- 2. Drop old text columns from messages table if they exist
ALTER TABLE messages DROP COLUMN IF EXISTS mobile;
ALTER TABLE messages DROP COLUMN IF EXISTS name;
ALTER TABLE messages DROP COLUMN IF EXISTS region;
ALTER TABLE messages DROP COLUMN IF EXISTS property_type;
ALTER TABLE messages DROP COLUMN IF EXISTS category;
ALTER TABLE messages DROP COLUMN IF EXISTS purpose;


-- 3. Create Indexes
CREATE INDEX IF NOT EXISTS idx_sender_mobile ON sender(mobile);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_region_id ON messages(region_id);
CREATE INDEX IF NOT EXISTS idx_messages_property_type_id ON messages(property_type_id);

-- 4. Enable Security (RLS)
ALTER TABLE sender ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE purposes ENABLE ROW LEVEL SECURITY;

-- 5. Re-create View with joins (Modernized)
CREATE OR REPLACE VIEW messages_with_sender AS
SELECT 
  m.id,
  m.message,
  m.date_of_creation,
  m.source_file,
  m.image_url,
  c.name as category,
  pt.name as property_type,
  r.name as region,
  p.name as purpose,
  s.id as sender_id,
  s.name as sender_name,
  s.mobile as sender_mobile,
  s.first_seen_date,
  s.first_seen_time,
  m.created_at
FROM messages m
LEFT JOIN sender s ON m.sender_id = s.id
LEFT JOIN regions r ON m.region_id = r.id
LEFT JOIN property_types pt ON m.property_type_id = pt.id
LEFT JOIN categories c ON m.category_id = c.id
LEFT JOIN purposes p ON m.purpose_id = p.id;

-- 6. Policies
DO $$ 
BEGIN
  -- Drop existing policies to avoid errors on rerun
  DROP POLICY IF EXISTS "Public read sender" ON sender;
  DROP POLICY IF EXISTS "Public read regions" ON regions;
  DROP POLICY IF EXISTS "Public read types" ON property_types;
  DROP POLICY IF EXISTS "Public read categories" ON categories;
  DROP POLICY IF EXISTS "Public read purposes" ON purposes;
  DROP POLICY IF EXISTS "Service role full access" ON sender;
END $$;

CREATE POLICY "Public read sender" ON sender FOR SELECT USING (true);
CREATE POLICY "Public read regions" ON regions FOR SELECT USING (true);
CREATE POLICY "Public read types" ON property_types FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read purposes" ON purposes FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON sender FOR ALL USING (true);
GRANT SELECT ON messages_with_sender TO anon, authenticated;

-- Done!
SELECT 'Migration Complete' as status;
