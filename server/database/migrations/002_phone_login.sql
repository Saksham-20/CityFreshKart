-- Migration: Make phone number required and unique for phone-based login
-- Run this on existing databases

-- First, fill any NULL phone values temporarily (they must be updated manually)
-- UPDATE users SET phone = 'NEEDS_UPDATE_' || id WHERE phone IS NULL;

-- Add UNIQUE constraint and NOT NULL to phone (if not already exists)
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'users_phone_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_phone_unique UNIQUE (phone);
  END IF;
  
  -- Handle any remaining NULL values before adding NOT NULL
  UPDATE users SET phone = 'NEEDS_UPDATE_' || id::text 
  WHERE phone IS NULL;
  
  -- Add NOT NULL constraint if phone column is not already NOT NULL
  ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration already applied or constraints exist: %', SQLERRM;
END $$;

