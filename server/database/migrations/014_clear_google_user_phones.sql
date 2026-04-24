-- Migration: Clear phone numbers for users who logged in via Google
-- Reason: Stop using auto-generated synthetic phone numbers for Google-logged-in users
-- All users with google_uid will have their phone set to a unique placeholder
-- They will be prompted to add their real phone number at checkout

BEGIN;

-- Generates unique sequential placeholders: 0000000001, 0000000002, etc.
-- Uses ROW_NUMBER() to ensure uniqueness
-- Idempotent: only updates Google users without placeholder phones
-- Offset by existing highest placeholder to avoid conflicts

-- Find the max existing placeholder number
WITH placeholder_stats AS (
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN phone ~ '^0{0,9}\d{1,10}$' AND phone LIKE '0000000%'
        THEN CAST(LPAD(phone, 10, '0') AS BIGINT)
        ELSE 0
      END
    ), 
    0
  ) as max_num
  FROM users
  WHERE phone LIKE '0000000%'
),
-- Get Google users that need placeholder phones
users_to_update AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY id) + (SELECT max_num FROM placeholder_stats) as seq_num
  FROM users
  WHERE google_uid IS NOT NULL
    AND (phone IS NULL OR (phone NOT LIKE '0000000%'))
)
UPDATE users u
SET phone = LPAD(utu.seq_num::text, 10, '0'),
    updated_at = CURRENT_TIMESTAMP
FROM users_to_update utu
WHERE u.id = utu.id;

COMMIT;
