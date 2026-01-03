-- Drop glomar_properties table (5th Settlement properties)
-- Run this in Supabase SQL Editor to remove the 5th Settlement data

-- ============================================
-- GLOMAR TABLES TO DROP (5th Settlement)
-- ============================================

-- Main table: glomar_properties
-- This table contained all property listings from the 5th Settlement area
-- Structure typically included:
--   - id (primary key)
--   - title, name, compoundname (property names)
--   - description, note (property details)
--   - mobileno, tel (contact info - SENSITIVE DATA)
--   - totalprice, currency_name (pricing)
--   - property_type_name, category_name, region_name, property_purpose_name (classifications)
--   - rooms, building, built_area, spaceunit, spaceeerth, thefloors (property specs)
--   - finishing_level_name, inoroutsidecompound, propertyofferedby, status (additional info)
--   - location (address)
--   - propertyimage, videos (media - stored as JSON arrays with file IDs)
--   - created_at, updated_at (timestamps)

-- Related tables (if any):
-- Note: Based on the archive migration scripts, the glomar data was imported
-- from a remote MySQL database (glomart_data) which had:
--   - properties (main table)
--   - properties_images (separate image storage)
--   - properties_videos (separate video storage)
--   - projects (compound/project info)
--
-- In Supabase, this was consolidated into a single table: glomar_properties
-- with JSON fields for images and videos

-- ============================================
-- DROP ALL GLOMAR TABLES (14 TABLES TOTAL)
-- ============================================

-- Drop all glomar-related tables in the correct order
-- (cascade will handle dependencies, but listing explicitly for clarity)

-- Main properties and media tables
DROP TABLE IF EXISTS glomar_properties CASCADE;
DROP TABLE IF EXISTS glomar_properties_images CASCADE;
DROP TABLE IF EXISTS glomar_properties_videos CASCADE;
DROP TABLE IF EXISTS glomar_property_images CASCADE;
DROP TABLE IF EXISTS glomar_property_videos CASCADE;

-- Lookup/reference tables
DROP TABLE IF EXISTS glomar_countries CASCADE;
DROP TABLE IF EXISTS glomar_currencies CASCADE;
DROP TABLE IF EXISTS glomar_regions CASCADE;
DROP TABLE IF EXISTS glomar_property_types CASCADE;
DROP TABLE IF EXISTS glomar_property_categories CASCADE;
DROP TABLE IF EXISTS glomar_property_purposes CASCADE;
DROP TABLE IF EXISTS glomar_property_statuses CASCADE;
DROP TABLE IF EXISTS glomar_finishing_levels CASCADE;
DROP TABLE IF EXISTS glomar_unit_facilities CASCADE;

-- Configuration tables
DROP TABLE IF EXISTS glomar_filtersettings CASCADE;

-- Note: CASCADE will also drop:
--   - Any dependent views
--   - Any foreign key constraints
--   - Any indexes on these tables
--
-- This completely removes ALL 5th Settlement data from the database (14 tables)

-- ============================================
-- WHAT REMAINS AFTER THIS SCRIPT
-- ============================================
-- Only the 10th of Ramadan tables:
--   - messages (WhatsApp messages with property info)
--   - sender (contact information from messages)
--   - users (broker/admin accounts)
--   - chat_uploads (file upload tracking)

