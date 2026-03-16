-- Migration: Add price_per_kg and discount columns to products table
-- This migration updates the products table to support weight-based pricing for the MVP

BEGIN;

-- Add price_per_kg column (for kg-based pricing in quick commerce)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS price_per_kg DECIMAL(10,2);

-- Add discount column (percentage discount from 0-100)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS discount DECIMAL(5,2) DEFAULT 0;

-- Create index on price_per_kg for faster queries
CREATE INDEX IF NOT EXISTS idx_products_price_per_kg ON products(price_per_kg);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Create index on is_active for availability filtering
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

COMMIT;
