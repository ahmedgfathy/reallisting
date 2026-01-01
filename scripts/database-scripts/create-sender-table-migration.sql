-- Migration: Create sender table and extract contact info from messages
-- This extracts phone numbers from message content and creates proper relationships
-- Run this in Supabase SQL Editor

-- Step 1: Create sender table
CREATE TABLE IF NOT EXISTS sender (
  id SERIAL PRIMARY KEY,
  name TEXT,
  mobile TEXT UNIQUE NOT NULL,
  first_seen_date TEXT,
  first_seen_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add sender_id foreign key to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS sender_id INTEGER REFERENCES sender(id) ON DELETE SET NULL;

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sender_mobile ON sender(mobile);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Step 4: Create function to extract Egyptian mobile numbers from text
CREATE OR REPLACE FUNCTION extract_egyptian_mobile(text_content TEXT)
RETURNS TEXT AS $$
DECLARE
  mobile_match TEXT;
BEGIN
  -- Try to match Egyptian mobile format: 01xxxxxxxxx (11 digits)
  mobile_match := (regexp_matches(text_content, '\y01[0-9]{9}\y'))[1];
  
  IF mobile_match IS NOT NULL THEN
    RETURN mobile_match;
  END IF;
  
  -- Try to match +201xxxxxxxxx format
  mobile_match := (regexp_matches(text_content, '\+201[0-9]{9}\y'))[1];
  IF mobile_match IS NOT NULL THEN
    -- Remove + and 20 prefix to normalize
    RETURN substring(mobile_match from 3);
  END IF;
  
  -- Try to match any 11-digit number
  mobile_match := (regexp_matches(text_content, '\y\d{11}\y'))[1];
  IF mobile_match IS NOT NULL AND left(mobile_match, 2) = '01' THEN
    RETURN mobile_match;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Extract and populate sender table from messages
-- This finds unique mobile numbers in message content
INSERT INTO sender (mobile, name, first_seen_date, first_seen_time)
SELECT DISTINCT ON (mobile_number)
  mobile_number as mobile,
  m.name as name,
  m.date_of_creation as first_seen_date,
  split_part(m.date_of_creation, ' ', 2) as first_seen_time
FROM (
  SELECT 
    id,
    name,
    date_of_creation,
    COALESCE(
      extract_egyptian_mobile(message),
      extract_egyptian_mobile(mobile)
    ) as mobile_number
  FROM messages
  WHERE message IS NOT NULL OR mobile IS NOT NULL
) m
WHERE m.mobile_number IS NOT NULL
  AND m.mobile_number NOT IN ('N/A', '')
  AND m.mobile_number ~ '^[0-9+]{10,15}$'
ORDER BY mobile_number, date_of_creation
ON CONFLICT (mobile) DO NOTHING;

-- Step 6: Also insert from the mobile field in messages table
INSERT INTO sender (mobile, name, first_seen_date, first_seen_time)
SELECT DISTINCT ON (m.mobile)
  m.mobile,
  m.name,
  m.date_of_creation,
  split_part(m.date_of_creation, ' ', 2) as first_seen_time
FROM messages m
WHERE m.mobile IS NOT NULL 
  AND m.mobile NOT IN ('N/A', '')
  AND m.mobile ~ '^\+?[0-9]{10,15}$'
  AND NOT EXISTS (
    SELECT 1 FROM sender WHERE sender.mobile = m.mobile
  )
ORDER BY m.mobile, m.date_of_creation
ON CONFLICT (mobile) DO NOTHING;

-- Step 7: Link messages to sender table
-- Update messages with sender_id based on extracted mobile from message content
UPDATE messages m
SET sender_id = s.id
FROM sender s
WHERE extract_egyptian_mobile(m.message) = s.mobile
  AND m.sender_id IS NULL;

-- Step 8: Link messages to sender based on mobile field
UPDATE messages m
SET sender_id = s.id
FROM sender s
WHERE m.mobile = s.mobile
  AND m.mobile NOT IN ('N/A', '')
  AND m.sender_id IS NULL;

-- Step 9: Create function to clean message content (remove phone numbers)
CREATE OR REPLACE FUNCTION clean_message_content()
RETURNS void AS $$
BEGIN
  -- Remove Egyptian mobile numbers from message content
  UPDATE messages
  SET message = regexp_replace(
    regexp_replace(
      regexp_replace(
        message,
        '\y01[0-9]{9}\y',
        '',
        'g'
      ),
      '\+201[0-9]{9}\y',
      '',
      'g'
    ),
    '\s+',
    ' ',
    'g'
  )
  WHERE sender_id IS NOT NULL
    AND message ~ '01[0-9]{9}|\\+201[0-9]{9}';
END;
$$ LANGUAGE plpgsql;

-- Step 10: Clean mobile numbers from message content (optional - uncomment if you want to run)
-- SELECT clean_message_content();

-- Step 11: Create view for easy access to messages with sender info
CREATE OR REPLACE VIEW messages_with_sender AS
SELECT 
  m.id,
  m.message,
  m.date_of_creation,
  m.source_file,
  m.category,
  m.property_type,
  m.region,
  m.purpose,
  s.id as sender_id,
  s.name as sender_name,
  s.mobile as sender_mobile,
  s.first_seen_date,
  s.first_seen_time,
  m.created_at
FROM messages m
LEFT JOIN sender s ON m.sender_id = s.id;

-- Step 12: Create function to get or create sender
CREATE OR REPLACE FUNCTION get_or_create_sender(
  p_mobile TEXT,
  p_name TEXT DEFAULT NULL,
  p_date TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_sender_id INTEGER;
BEGIN
  -- Try to find existing sender
  SELECT id INTO v_sender_id
  FROM sender
  WHERE mobile = p_mobile;
  
  -- If not found, create new sender
  IF v_sender_id IS NULL THEN
    INSERT INTO sender (mobile, name, first_seen_date, first_seen_time)
    VALUES (
      p_mobile,
      p_name,
      p_date,
      split_part(p_date, ' ', 2)
    )
    RETURNING id INTO v_sender_id;
  END IF;
  
  RETURN v_sender_id;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Grant permissions
GRANT SELECT ON sender TO anon, authenticated;
GRANT SELECT ON messages_with_sender TO anon, authenticated;
GRANT ALL ON sender TO service_role;
GRANT USAGE, SELECT ON SEQUENCE sender_id_seq TO service_role;

-- Step 14: Enable RLS on sender table
ALTER TABLE sender ENABLE ROW LEVEL SECURITY;

-- Create policy for sender table
CREATE POLICY "Allow public read sender" ON sender FOR SELECT USING (true);
CREATE POLICY "Allow service role full access sender" ON sender FOR ALL USING (true);

-- Step 15: Show statistics
SELECT 
  'Messages' as table_name,
  COUNT(*) as total_rows,
  COUNT(sender_id) as with_sender,
  COUNT(*) - COUNT(sender_id) as without_sender
FROM messages
UNION ALL
SELECT 
  'Senders' as table_name,
  COUNT(*) as total_rows,
  COUNT(mobile) as with_mobile,
  0 as without_sender
FROM sender;

-- Done! Summary of what was created:
-- 1. sender table with: id, name, mobile, first_seen_date, first_seen_time, timestamps
-- 2. sender_id foreign key in messages table
-- 3. Extracted all phone numbers from messages and populated sender table
-- 4. Linked messages to senders via sender_id
-- 5. Created helper functions and views
-- 6. Set up proper indexes and RLS policies
