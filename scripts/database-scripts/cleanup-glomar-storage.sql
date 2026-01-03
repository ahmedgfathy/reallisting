-- ============================================
-- CLEANUP GLOMAR STORAGE BUCKETS (5th Settlement)
-- ============================================
-- Run this in Supabase SQL Editor AFTER dropping the tables
-- This will remove the 'properties' storage bucket and all its contents

-- WARNING: This will permanently delete all images/videos from the 5th Settlement
-- Estimated: ~12,000 images/videos

-- ============================================
-- STEP 1: Delete all storage policies for 'properties' bucket
-- ============================================

DROP POLICY IF EXISTS "Public read access for properties" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to properties" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete from properties" ON storage.objects;

-- ============================================
-- STEP 2: Delete all objects in the 'properties' bucket
-- ============================================

-- This deletes all files in the bucket
DELETE FROM storage.objects WHERE bucket_id = 'properties';

-- ============================================
-- STEP 3: Delete the bucket itself
-- ============================================

DELETE FROM storage.buckets WHERE id = 'properties';

-- ============================================
-- VERIFICATION
-- ============================================

-- Check that the bucket is gone
SELECT * FROM storage.buckets WHERE id = 'properties';
-- Should return 0 rows

-- ============================================
-- WHAT REMAINS AFTER THIS SCRIPT
-- ============================================
-- Only the 10th of Ramadan storage:
--   - whatsapp-chats (bucket for uploaded WhatsApp TXT files)
--
-- All 5th Settlement (glomar) images/videos are permanently deleted
