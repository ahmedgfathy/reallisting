-- Add name column to users table for user profiles
ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;

-- Add comment for documentation
COMMENT ON COLUMN users.name IS 'Optional display name for the user';
