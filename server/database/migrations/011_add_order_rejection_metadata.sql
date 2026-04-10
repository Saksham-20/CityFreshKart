-- Migration: add rejection metadata for soft-rejected/cancelled orders

BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id) ON DELETE SET NULL;

COMMIT;
