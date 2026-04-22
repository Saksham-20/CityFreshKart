-- Migration: Clear phone numbers for users who logged in via Google
-- Reason: Stop using auto-generated synthetic phone numbers for Google-logged-in users
-- All users with google_uid will have their phone set to a unique placeholder
-- They will be prompted to add their real phone number at checkout

BEGIN;

-- Update all Google-authenticated users to have a unique placeholder phone
-- Generates unique sequential placeholders: 0000000001, 0000000002, etc.
-- Only updates if not already a placeholder (idempotent - safe to run multiple times)
UPDATE users u
SET phone = LPAD((
  SELECT COUNT(*) FROM users WHERE google_uid IS NOT NULL AND id <= u.id
)::text, 10, '0'),
    updated_at = CURRENT_TIMESTAMP
WHERE google_uid IS NOT NULL
  AND phone IS NOT NULL
  AND phone NOT LIKE '0000000%';

COMMIT;
