-- Supabase Database Schema for Real Listing Application
-- Run this SQL in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(32) PRIMARY KEY,
  mobile VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(64) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'broker',
  is_active BOOLEAN DEFAULT FALSE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(32) PRIMARY KEY,
  message TEXT,
  sender_name VARCHAR(255),
  sender_mobile VARCHAR(20),
  date_of_creation TIMESTAMP WITH TIME ZONE,
  source_file VARCHAR(255),
  image_url VARCHAR(500),
  category VARCHAR(100) DEFAULT 'أخرى',
  property_type VARCHAR(100) DEFAULT 'أخرى',
  region VARCHAR(100) DEFAULT 'أخرى',
  purpose VARCHAR(100) DEFAULT 'أخرى',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_category ON messages(category);
CREATE INDEX IF NOT EXISTS idx_messages_property_type ON messages(property_type);
CREATE INDEX IF NOT EXISTS idx_messages_region ON messages(region);
CREATE INDEX IF NOT EXISTS idx_messages_purpose ON messages(purpose);
CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date_of_creation);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regions_name ON regions(name);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Allow anonymous read access to users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to users" ON users
  FOR ALL USING (true);

-- Create policies for messages table
CREATE POLICY "Allow anonymous read access to messages" ON messages
  FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to messages" ON messages
  FOR ALL USING (true);

-- Create policies for regions table
CREATE POLICY "Allow anonymous read access to regions" ON regions
  FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to regions" ON regions
  FOR ALL USING (true);

-- Insert default regions
INSERT INTO regions (id, name) VALUES
  (md5(random()::text || clock_timestamp()::text)::varchar(32), 'الحي الأول'),
  (md5(random()::text || clock_timestamp()::text)::varchar(32), 'الحي الثاني'),
  (md5(random()::text || clock_timestamp()::text)::varchar(32), 'الحي الثالث'),
  (md5(random()::text || clock_timestamp()::text)::varchar(32), 'الحي الرابع'),
  (md5(random()::text || clock_timestamp()::text)::varchar(32), 'الحي الخامس'),
  (md5(random()::text || clock_timestamp()::text)::varchar(32), 'العليا'),
  (md5(random()::text || clock_timestamp()::text)::varchar(32), 'الملقا'),
  (md5(random()::text || clock_timestamp()::text)::varchar(32), 'النسيم'),
  (md5(random()::text || clock_timestamp()::text)::varchar(32), 'الرمال'),
  (md5(random()::text || clock_timestamp()::text)::varchar(32), 'المروج'),
  (md5(random()::text || clock_timestamp()::text)::varchar(32), 'أخرى')
ON CONFLICT (name) DO NOTHING;

-- Success message
SELECT 'Database schema created successfully!' as status;
