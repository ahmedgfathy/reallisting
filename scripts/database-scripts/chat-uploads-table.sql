-- Create chat_uploads tracking table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS chat_uploads (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  total_parsed INTEGER DEFAULT 0,
  total_imported INTEGER DEFAULT 0,
  senders_created INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_chat_uploads_status ON chat_uploads(status);
CREATE INDEX IF NOT EXISTS idx_chat_uploads_uploaded_by ON chat_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_chat_uploads_uploaded_at ON chat_uploads(uploaded_at DESC);

-- Enable Row Level Security
ALTER TABLE chat_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Allow admin read chat_uploads" ON chat_uploads FOR SELECT USING (true);
CREATE POLICY "Allow admin insert chat_uploads" ON chat_uploads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin update chat_uploads" ON chat_uploads FOR UPDATE USING (true);

-- Create storage bucket for WhatsApp chat files (run this in Supabase Storage UI or SQL)
-- Note: You can also create this in the Supabase Dashboard > Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-chats', 'whatsapp-chats', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the bucket
CREATE POLICY "Allow authenticated upload to whatsapp-chats"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-chats');

CREATE POLICY "Allow authenticated read from whatsapp-chats"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'whatsapp-chats');

CREATE POLICY "Allow service role full access to whatsapp-chats"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'whatsapp-chats');
