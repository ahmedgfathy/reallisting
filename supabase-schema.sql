-- Supabase Schema for Real Listing App
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  mobile VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'broker',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  mobile TEXT DEFAULT 'N/A',
  message TEXT,
  date_of_creation TEXT,
  source_file TEXT,
  category TEXT DEFAULT 'أخرى',
  property_type TEXT DEFAULT 'أخرى',
  region TEXT DEFAULT 'أخرى',
  purpose TEXT DEFAULT 'أخرى',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_messages_category ON messages(category);
CREATE INDEX idx_messages_property_type ON messages(property_type);
CREATE INDEX idx_messages_region ON messages(region);
CREATE INDEX idx_messages_purpose ON messages(purpose);
CREATE INDEX idx_messages_source_file ON messages(source_file);
CREATE INDEX idx_users_mobile ON users(mobile);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to messages (authenticated users)
CREATE POLICY "Allow public read messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Allow service role full access messages" ON messages FOR ALL USING (true);

CREATE POLICY "Allow public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow service role full access users" ON users FOR ALL USING (true);
