-- Fix data types for glomar_properties table
-- Run these commands in Supabase SQL Editor

ALTER TABLE glomar_properties 
  ALTER COLUMN liked TYPE TEXT,
  ALTER COLUMN inhome TYPE TEXT,
  ALTER COLUMN rooms TYPE TEXT,
  ALTER COLUMN totalprice TYPE TEXT,
  ALTER COLUMN pricepermeter TYPE TEXT,
  ALTER COLUMN downpayment TYPE TEXT,
  ALTER COLUMN spaceeerth TYPE TEXT,
  ALTER COLUMN spaceunit TYPE TEXT,
  ALTER COLUMN spaceguard TYPE TEXT,
  ALTER COLUMN _sequence TYPE TEXT;
