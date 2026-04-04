-- Migration: Add ON DELETE CASCADE to orders.user_id foreign key
-- This allows users to be deleted even if they have associated orders
-- The orders will be automatically deleted when their parent user is deleted

-- Timeline: April 4, 2026
-- Reason: Fix user deletion error (FK constraint 23503) when user has existing orders
-- Note: Applied AFTER 009_hot_query_indexes.sql

BEGIN;

-- Check if the constraint exists and drop it if it does
DO $$ 
BEGIN
  IF EXISTS (
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'orders' AND constraint_type = 'FOREIGN KEY'
    AND constraint_name = 'orders_user_id_fkey'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_user_id_fkey;
  END IF;
END $$;

-- Add the new foreign key constraint with ON DELETE CASCADE
ALTER TABLE orders
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;

-- Verification query (run after migration):
-- SELECT constraint_name, column_name, is_deferrable, table_name 
-- FROM information_schema.key_column_usage 
-- WHERE table_name = 'orders' AND column_name = 'user_id';
