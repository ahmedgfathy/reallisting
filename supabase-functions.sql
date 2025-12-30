-- Run this in Supabase SQL Editor to create the function for efficient distinct regions

CREATE OR REPLACE FUNCTION get_distinct_regions()
RETURNS TABLE (region TEXT) 
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT region 
  FROM messages 
  WHERE region IS NOT NULL 
  ORDER BY region;
$$;
