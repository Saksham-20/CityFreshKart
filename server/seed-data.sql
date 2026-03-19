-- Insert sample categories
INSERT INTO categories (id, name, slug, description, "createdAt", "updatedAt") VALUES
  ('cat-1', 'Vegetables', 'vegetables', 'Fresh vegetables and greens', NOW(), NOW()),
  ('cat-2', 'Fruits', 'fruits', 'Fresh fruits', NOW(), NOW()),
  ('cat-3', 'Herbs', 'herbs', 'Fresh herbs and greens', NOW(), NOW());

-- Insert sample products
INSERT INTO products (id, name, slug, description, "short_description", image, "category_id", price, price_per_kg, discount, sku, stock_quantity, "is_featured", "is_active", "meta_title", "meta_description", "createdAt", "updatedAt") VALUES
  ('prod-1', 'Tomato', 'tomato', 'Fresh red tomatoes', 'Fresh tomatoes', 'tomato.jpg', 'cat-1', 50, 50, 0, 'TOMATO-001', 100, true, true, 'Fresh Tomatoes', 'Organic fresh red tomatoes', NOW(), NOW()),
  ('prod-2', 'Onion', 'onion', 'Yellow onions', 'Fresh yellow onions', 'onion.jpg', 'cat-1', 30, 30, 0, 'ONION-001', 150, true, true, 'Fresh Onions', 'Yellow onions for cooking', NOW(), NOW()),
  ('prod-3', 'Carrot', 'carrot', 'Orange carrots', 'Fresh carrots', 'carrot.jpg', 'cat-1', 40, 40, 0, 'CARROT-001', 80, true, true, 'Fresh Carrots', 'Organic carrots', NOW(), NOW()),
  ('prod-4', 'Apple', 'apple', 'Red apples', 'Fresh red apples', 'apple.jpg', 'cat-2', 80, 80, 10, 'APPLE-001', 60, true, true, 'Fresh Apples', 'Red apples from orchards', NOW(), NOW()),
  ('prod-5', 'Banana', 'banana', 'Yellow bananas', 'Fresh bananas', 'banana.jpg', 'cat-2', 60, 60, 5, 'BANANA-001', 120, true, true, 'Fresh Bananas', 'Ripe yellow bananas', NOW(), NOW());

-- Insert sample users
INSERT INTO users (id, email, password, "firstName", "lastName", phone, "isAdmin", "isVerified", "createdAt", "updatedAt") VALUES
  ('user-1', 'admin@cityfreshkart.in', '$2a$10$8fTGQfTKDVkG9Q7Q9Q7Q9O5yq4b0y5yq4b0y5yq4b0y5yq4b0y5yq', 'Admin', 'User', '+91-9876543210', true, true, NOW(), NOW()),
  ('user-2', 'john@example.com', '$2a$10$8fTGQfTKDVkG9Q7Q9Q7Q9O5yq4b0y5yq4b0y5yq4b0y5yq4b0y5yq', 'John', 'Doe', '+91-9876543211', false, true, NOW(), NOW());
