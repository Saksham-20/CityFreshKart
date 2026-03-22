-- Per-product quantity display: kg vs g (internal quantity remains in kg)
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_display_unit VARCHAR(2) DEFAULT 'kg';
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_weight_display_unit_check;
ALTER TABLE products ADD CONSTRAINT products_weight_display_unit_check
  CHECK (weight_display_unit IN ('kg', 'g'));

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS weight_display_unit VARCHAR(2) DEFAULT 'kg';
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_weight_display_unit_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_weight_display_unit_check
  CHECK (weight_display_unit IN ('kg', 'g'));
