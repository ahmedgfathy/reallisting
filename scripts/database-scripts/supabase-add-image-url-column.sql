-- Add image_url column to messages table
-- This migration adds support for property images

ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for better performance when filtering by images
CREATE INDEX IF NOT EXISTS idx_messages_image_url ON messages(image_url) WHERE image_url IS NOT NULL;

-- Comment on the column
COMMENT ON COLUMN messages.image_url IS 'URL of the property image';
