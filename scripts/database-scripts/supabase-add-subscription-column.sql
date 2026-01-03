-- Add subscription_end_date column to users table for subscription management
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end_date timestamp;

-- Add comment for documentation
COMMENT ON COLUMN users.subscription_end_date IS 'Date when user subscription expires, NULL means no active subscription';

-- Create index for faster lookups of expiring subscriptions
CREATE INDEX IF NOT EXISTS idx_users_subscription_end ON users(subscription_end_date) WHERE subscription_end_date IS NOT NULL;
