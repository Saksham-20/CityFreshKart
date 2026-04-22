-- Migration: Clear phone numbers for users who logged in via Google
-- Reason: Stop using auto-generated synthetic phone numbers for Google-logged-in users
-- All users with google_uid will have their phone set to a placeholder
-- They will be prompted to add their real phone number at checkout

BEGIN;

-- Update all Google-authenticated users to have a placeholder phone
-- Use 0000000000 as a marker that phone needs to be filled in
UPDATE users
SET phone = '0000000000',
    updated_at = CURRENT_TIMESTAMP
WHERE google_uid IS NOT NULL
  AND phone IS NOT NULL;

COMMIT;
