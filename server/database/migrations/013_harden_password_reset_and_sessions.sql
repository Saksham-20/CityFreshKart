ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

UPDATE users
SET password_changed_at = COALESCE(password_changed_at, CURRENT_TIMESTAMP)
WHERE password_changed_at IS NULL;

ALTER TABLE password_reset_otps
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_phone_active
  ON password_reset_otps(phone, expires_at DESC)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_reset_token_active
  ON password_reset_otps(reset_token_hash, expires_at DESC)
  WHERE used_at IS NULL AND reset_token_hash IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_users_email_unique_ci_nonnull'
  ) THEN
    IF EXISTS (
      SELECT LOWER(TRIM(email))
      FROM users
      WHERE email IS NOT NULL
      GROUP BY LOWER(TRIM(email))
      HAVING COUNT(*) > 1
    ) THEN
      RAISE NOTICE 'Skipping idx_users_email_unique_ci_nonnull due to existing duplicate emails';
    ELSE
      CREATE UNIQUE INDEX idx_users_email_unique_ci_nonnull
        ON users (LOWER(TRIM(email)))
        WHERE email IS NOT NULL;
    END IF;
  END IF;
END $$;
