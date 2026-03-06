-- SQL Script to update the users table in Supabase
-- Run this script in the Supabase SQL Editor

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS aadhar_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS department VARCHAR(255),
ADD COLUMN IF NOT EXISTS badge_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS specialization VARCHAR(100),
ADD COLUMN IF NOT EXISTS bar_council VARCHAR(255),
ADD COLUMN IF NOT EXISTS experience_years INTEGER,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending';

-- You can also optionally update the schema.sql in backend/database/schema.sql 
-- to reflect these changes for future initializations.
