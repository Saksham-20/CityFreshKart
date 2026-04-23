-- Migration: Add order_audit_log table for tracking price changes
-- This table tracks whenever orders are created or their totals change,
-- helping identify when product prices were modified after order placement

CREATE TABLE IF NOT EXISTS order_audit_log (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Event tracking
  event_type VARCHAR(50) NOT NULL, -- 'order_created', 'price_recalculated', 'payment_verified'
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Original values (from client/order at time of placement)
  received_subtotal DECIMAL(10, 2),
  received_total DECIMAL(10, 2),
  received_delivery_fee DECIMAL(10, 2),
  
  -- Calculated values (from backend recalculation)
  calculated_subtotal DECIMAL(10, 2),
  calculated_total DECIMAL(10, 2),
  calculated_delivery_fee DECIMAL(10, 2),
  
  -- Item-level details (for debugging)
  items_json JSONB, -- Full item calculations array
  
  -- Context
  discrepancy_amount DECIMAL(10, 2), -- Difference between received and calculated
  discrepancy_percent DECIMAL(5, 2), -- Percentage difference
  reason VARCHAR(500), -- Why recalculation occurred
  
  -- Additional context
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  INDEX idx_order_id (order_id),
  INDEX idx_user_id (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_timestamp (timestamp)
);

-- Trigger to log when orders are created
CREATE OR REPLACE FUNCTION log_order_creation() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO order_audit_log (
    order_id, user_id, event_type, timestamp,
    calculated_subtotal, calculated_total, calculated_delivery_fee,
    reason
  ) VALUES (
    NEW.id, NEW.user_id, 'order_created', NOW(),
    NEW.subtotal, NEW.total_price, NEW.delivery_fee,
    'Order created from cart'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS order_creation_audit_trigger ON orders;

-- Create trigger
CREATE TRIGGER order_creation_audit_trigger
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION log_order_creation();

-- Index for quick lookup of discrepancies
CREATE INDEX IF NOT EXISTS idx_discrepancy_amount ON order_audit_log(discrepancy_amount)
WHERE discrepancy_amount IS NOT NULL AND discrepancy_amount > 0.1;
