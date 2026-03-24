-- CityFreshKart Database Schema (Simplified - Produce Vendor)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Phone+Password Authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products table (Weight-based pricing for produce)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'Uncategorized',
    price_per_kg DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    quantity_available DECIMAL(10,2) DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Backward compatible schema additions for existing products tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Uncategorized';
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_per_kg DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image VARCHAR(500);
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_available DECIMAL(10,2) DEFAULT 100;
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE products ADD COLUMN IF NOT EXISTS name_hindi TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_keywords TEXT;


-- Categories (normalized; optional FK on products.category_id for joins in cart/API)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Backward compatibility: existing categories tables may miss UUID default.
ALTER TABLE categories ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE categories ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE categories ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

INSERT INTO categories (name, slug) VALUES
    ('Vegetables', 'vegetables'),
    ('Fruits', 'fruits'),
    ('Dairy', 'dairy'),
    ('Bakery', 'bakery'),
    ('Grains', 'grains'),
    ('Herbs & Spices', 'herbs-spices'),
    ('Other', 'other')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Optional FK for stock reporting (mirrors quantity_available for code paths that read stock_quantity)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity DECIMAL(10,2) DEFAULT 0;

-- Legacy cart was line-items-in-one-table; migrate to header + cart_items when present
DO $$
BEGIN
    IF to_regclass('public.cart') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'cart' AND column_name = 'product_id'
       )
    THEN
        ALTER TABLE cart RENAME TO cart_legacy;
    END IF;
END $$;

-- Cart header: one row per user (matches server routes)
CREATE TABLE IF NOT EXISTS cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES cart(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    weight DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, product_id)
);

DO $$
BEGIN
    IF to_regclass('public.cart_legacy') IS NOT NULL THEN
        INSERT INTO cart (id, user_id, created_at, updated_at)
        SELECT uuid_generate_v4(), u.user_id, u.created_min, u.updated_max
        FROM (
            SELECT user_id,
                   MIN(created_at) AS created_min,
                   MAX(updated_at) AS updated_max
            FROM cart_legacy
            GROUP BY user_id
        ) u
        WHERE NOT EXISTS (SELECT 1 FROM cart c WHERE c.user_id = u.user_id::uuid);

        INSERT INTO cart_items (id, cart_id, product_id, quantity, weight, created_at, updated_at)
        SELECT
            uuid_generate_v4(),
            c.id,
            cl.product_id::uuid,
            1,
            cl.quantity_kg,
            cl.created_at,
            cl.updated_at
        FROM cart_legacy cl
        INNER JOIN cart c ON c.user_id = cl.user_id::uuid
        -- Legacy cart_items may use text FK columns; compare via text to avoid text = uuid errors
        WHERE NOT EXISTS (
            SELECT 1 FROM cart_items ci
            WHERE ci.cart_id::text = c.id::text AND ci.product_id::text = cl.product_id::text
        );

        DROP TABLE cart_legacy CASCADE;
    END IF;
END $$;

-- Keep stock_quantity aligned with quantity_available (single source of truth for weight-based stock)
CREATE OR REPLACE FUNCTION sync_product_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.stock_quantity := COALESCE(NEW.quantity_available, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_sync_stock ON products;
CREATE TRIGGER trg_products_sync_stock
    BEFORE INSERT OR UPDATE OF quantity_available ON products
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_stock_quantity();

UPDATE products SET stock_quantity = COALESCE(quantity_available, 0);

-- Backfill category_id from legacy string column when possible
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE p.category_id IS NULL
  AND p.category IS NOT NULL
  AND LOWER(TRIM(p.category)) = LOWER(TRIM(c.name));

-- Orders table (Simplified for weight-based pricing)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    phone VARCHAR(20),
    delivery_address TEXT,
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    razorpay_payment_id VARCHAR(255),
    razorpay_order_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, confirmed, delivered, cancelled
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity_kg DECIMAL(10,2) NOT NULL,
    price_per_kg DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User addresses table (saved delivery addresses per user)
CREATE TABLE IF NOT EXISTS user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) DEFAULT '',
    address_line TEXT NOT NULL,
    house_number VARCHAR(100) NOT NULL DEFAULT '',
    floor VARCHAR(100) DEFAULT '',
    society VARCHAR(150) DEFAULT '',
    sector VARCHAR(150) DEFAULT '',
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    phone VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Backward compatible schema additions for existing deployments
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS house_number VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS floor VARCHAR(100) DEFAULT '';
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS society VARCHAR(150) DEFAULT '';
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS sector VARCHAR(150) DEFAULT '';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price_per_kg ON products(price_per_kg);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Create trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns (drop first so re-runs are idempotent)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cart_updated_at ON cart;
CREATE TRIGGER update_cart_updated_at BEFORE UPDATE ON cart FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_addresses_updated_at ON user_addresses;
CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON user_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON user_addresses(user_id, is_default);

-- Per-piece / per-kg pricing support
ALTER TABLE products ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(20) DEFAULT 'per_kg';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(20) DEFAULT 'per_kg';

-- Quantity label preference for per_kg products (stored qty still in kg)
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_display_unit VARCHAR(2) DEFAULT 'kg';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS weight_display_unit VARCHAR(2) DEFAULT 'kg';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255);

-- Store settings (min order amount, free delivery threshold, delivery fee)
CREATE TABLE IF NOT EXISTS store_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO store_settings (key, value) VALUES
    ('min_order_amount', '0'),
    ('free_delivery_threshold', '300'),
    ('delivery_fee', '50'),
    ('product_categories', '["Vegetables","Fruits","Dairy","Bakery","Grains","Herbs & Spices","Other"]')
ON CONFLICT (key) DO NOTHING;

DROP TRIGGER IF EXISTS update_store_settings_updated_at ON store_settings;
CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON store_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Web push subscriptions (for browser push notifications)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Marketing carousel (admin-managed storefront banners)
CREATE TABLE IF NOT EXISTS marketing_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) DEFAULT '',
    subtitle VARCHAR(500) DEFAULT '',
    image_url TEXT NOT NULL,
    link_url TEXT DEFAULT '',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_marketing_banners_updated_at ON marketing_banners;
CREATE TRIGGER update_marketing_banners_updated_at BEFORE UPDATE ON marketing_banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_marketing_banners_active_sort ON marketing_banners (is_active, sort_order, created_at DESC);

-- Wishlist tables removed (feature fully disabled)
DROP TABLE IF EXISTS wishlist CASCADE;
DROP TABLE IF EXISTS wishlists CASCADE;
DROP TABLE IF EXISTS wishlist_items CASCADE;
