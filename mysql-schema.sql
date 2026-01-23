-- MariaDB/MySQL Database Schema for Real Listing Application
-- Database: reallisting
-- Username: root
-- Password: zerocall

-- Create database
CREATE DATABASE IF NOT EXISTS reallisting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE reallisting;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(32) PRIMARY KEY,
  mobile VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(64) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'broker',
  is_active BOOLEAN DEFAULT FALSE,
  subscription_end_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_mobile (mobile),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(32) PRIMARY KEY,
  message TEXT,
  sender_name VARCHAR(255),
  sender_mobile VARCHAR(20),
  date_of_creation TIMESTAMP NULL,
  source_file VARCHAR(255),
  image_url VARCHAR(500),
  category VARCHAR(100) DEFAULT 'أخرى',
  property_type VARCHAR(100) DEFAULT 'أخرى',
  region VARCHAR(100) DEFAULT 'أخرى',
  purpose VARCHAR(100) DEFAULT 'أخرى',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_messages_category (category),
  INDEX idx_messages_property_type (property_type),
  INDEX idx_messages_region (region),
  INDEX idx_messages_purpose (purpose),
  INDEX idx_messages_date (date_of_creation),
  INDEX idx_messages_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_regions_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default regions
INSERT INTO regions (id, name) VALUES
  (MD5(CONCAT(RAND(), NOW())), 'الحي الأول'),
  (MD5(CONCAT(RAND(), NOW())), 'الحي الثاني'),
  (MD5(CONCAT(RAND(), NOW())), 'الحي الثالث'),
  (MD5(CONCAT(RAND(), NOW())), 'الحي الرابع'),
  (MD5(CONCAT(RAND(), NOW())), 'الحي الخامس'),
  (MD5(CONCAT(RAND(), NOW())), 'العليا'),
  (MD5(CONCAT(RAND(), NOW())), 'الملقا'),
  (MD5(CONCAT(RAND(), NOW())), 'النسيم'),
  (MD5(CONCAT(RAND(), NOW())), 'الرمال'),
  (MD5(CONCAT(RAND(), NOW())), 'المروج'),
  (MD5(CONCAT(RAND(), NOW())), 'أخرى')
ON DUPLICATE KEY UPDATE name=name;

SELECT 'Database schema created successfully!' as status;
