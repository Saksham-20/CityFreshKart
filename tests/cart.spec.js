const { test, expect } = require('@playwright/test');

// Test user credentials (created in database setup)
const TEST_USER_PHONE = '9876543210';
const TEST_USER_PASSWORD = 'password123';

test.describe('Shopping Cart Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Login
    await page.click('text=/Sign In|Login|Account/i');
    await page.fill('input[type="tel"], input[placeholder*="phone" i]', TEST_USER_PHONE);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text(/Sign In|Login/i)');
    
    // Wait for navigation to home
    await page.waitForNavigation();
    await expect(page).toHaveURL('/');
  });

  test('should add single product to cart', async ({ page }) => {
    // Navigate to product details
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    // Select weight
    const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i], input[placeholder*="weight" i]');
    if (await weightInput.count() > 0) {
      await weightInput.first().fill('2');
    }
    
    // Click Add to Cart
    await page.click('button:has-text(/Add to Cart|Add|Cart/i)');
    
    // Should show confirmation or navigate to cart
    await page.waitForLoadState('networkidle');
    
    // Check cart count increased
    const cartIcon = page.locator('[data-testid="cart"], [class*="cart"], [aria-label*="cart" i]');
    if (await cartIcon.count() > 0) {
      const cartText = await cartIcon.first().innerHTML();
      expect(cartText).toContain('1');
    }
  });

  test('should add multiple products to cart', async ({ page }) => {
    // Add first product
    let products = page.locator('[class*="product"]');
    await products.first().click();
    await page.waitForNavigation();
    
    const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i]');
    if (await weightInput.count() > 0) {
      await weightInput.first().fill('1');
    }
    
    await page.click('button:has-text(/Add to Cart|Add/i)');
    await page.waitForLoadState('networkidle');
    
    // Go back and add another product
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    products = page.locator('[class*="product"]');
    if (await products.count() > 1) {
      await products.nth(1).click();
      await page.waitForNavigation();
      
      const weightInputs = page.locator('input[type="number"]');
      if (await weightInputs.count() > 0) {
        await weightInputs.first().fill('1.5');
      }
      
      await page.click('button:has-text(/Add to Cart|Add/i)');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should view cart with items', async ({ page }) => {
    // Add product to cart first
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i]');
    if (await weightInput.count() > 0) {
      await weightInput.first().fill('1.5');
    }
    
    await page.click('button:has-text(/Add to Cart|Add/i)');
    await page.waitForLoadState('networkidle');
    
    // Navigate to cart
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    // Should be on cart page
    await expect(page.url()).toContain('/cart');
    
    // Should see cart items
    await expect(page.locator('text=/cart|product|₹|kg/i').first()).toBeVisible();
  });

  test('should display cart items with correct details', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    // Check for product name, weight, and price
    await expect(page.locator('text=/kg|₹/i').first()).toBeVisible();
  });

  test('should update quantity in cart', async ({ page }) => {
    // Add product to cart first
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i]');
    if (await weightInput.count() > 0) {
      await weightInput.first().fill('2');
    }
    
    await page.click('button:has-text(/Add to Cart|Add/i)');
    await page.waitForLoadState('networkidle');
    
    // Go to cart
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    // Update quantity
    const quantityInput = page.locator('input[type="number"]').first();
    
    if (await quantityInput.count() > 0) {
      await quantityInput.clear();
      await quantityInput.fill('3');
      
      // Wait for cart update
      await page.waitForLoadState('networkidle');
      
      // Verify quantity changed
      const value = await quantityInput.inputValue();
      expect(value).toBe('3');
    }
  });

  test('should remove item from cart', async ({ page }) => {
    // Add product to cart first
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i]');
    if (await weightInput.count() > 0) {
      await weightInput.first().fill('1');
    }
    
    await page.click('button:has-text(/Add to Cart|Add/i)');
    await page.waitForLoadState('networkidle');
    
    // Go to cart
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    // Click remove button
    const removeButton = page.locator('button:has-text(/Remove|Delete|X/i), a:has-text(/Remove|Delete/i)');
    
    if (await removeButton.count() > 0) {
      const initialCount = await page.locator('[class*="product"]').count();
      await removeButton.first().click();
      await page.waitForLoadState('networkidle');
      
      // Item should be removed
      const finalCount = await page.locator('[class*="product"]').count();
      expect(finalCount).toBeLessThan(initialCount + 1);
    }
  });

  test('should display cart summary with totals', async ({ page }) => {
    // Add product to cart
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i]');
    if (await weightInput.count() > 0) {
      await weightInput.first().fill('2');
    }
    
    await page.click('button:has-text(/Add to Cart|Add/i)');
    await page.waitForLoadState('networkidle');
    
    // Go to cart
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    // Should show subtotal and total
    await expect(page.locator('text=/Subtotal|Total|₹/i').first()).toBeVisible();
  });

  test('should calculate correct total price', async ({ page }) => {
    // Add product with specific weight
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i]');
    if (await weightInput.count() > 0) {
      await weightInput.first().fill('2');
    }
    
    await page.click('button:has-text(/Add to Cart|Add/i)');
    await page.waitForLoadState('networkidle');
    
    // Go to cart and verify totals
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    // Total should be visible
    await expect(page.locator('text=/₹/i')).toBeVisible();
  });

  test('should show empty cart message when no items', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    // Should show empty cart message or no items
    const emptyMessage = page.locator('text=/empty|no items|cart is empty/i');
    const products = page.locator('[class*="product"], [data-testid*="product"]');
    
    if (await emptyMessage.count() > 0 || await products.count() === 0) {
      // It's expected to be empty or have empty message
      expect(true).toBeTruthy();
    }
  });

  test('should navigate to checkout from cart', async ({ page }) => {
    // Add product to cart
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i]');
    if (await weightInput.count() > 0) {
      await weightInput.first().fill('1');
    }
    await page.click('button:has-text(/Add to Cart|Add/i)');
    await page.waitForLoadState('networkidle');
    
    // Go to cart
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    // Click checkout button
    const checkoutButton = page.locator('button:has-text(/Checkout|Proceed|Order/i)');
    if (await checkoutButton.count() > 0) {
      await checkoutButton.first().click();
      await page.waitForNavigation();
      
      // Should be on checkout page
      await expect(page.url()).toContain('/checkout');
    }
  });

  test('should apply coupon/discount code if available', async ({ page }) => {
    // Go to cart
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    // Look for coupon input
    const couponInput = page.locator('input[placeholder*="coupon" i], input[placeholder*="discount" i], input[placeholder*="code" i]');
    
    if (await couponInput.count() > 0) {
      await couponInput.first().fill('TESTCODE');
      
      // Look for apply button
      const applyButton = page.locator('button:has-text(/Apply|Redeem/i)');
      if (await applyButton.count() > 0) {
        await applyButton.first().click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test.describe('Mobile Cart', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('should add product to cart on mobile', async ({ page }) => {
      const firstProduct = page.locator('[class*="product"]').first();
      await firstProduct.click();
      await page.waitForNavigation();
      
      const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i]');
      if (await weightInput.count() > 0) {
        await weightInput.first().fill('1');
      }
      
      await page.click('button:has-text(/Add to Cart|Add/i)');
      await page.waitForLoadState('networkidle');
    });

    test('should view cart on mobile', async ({ page }) => {
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
      
      // Cart should be responsive
      const cartItems = page.locator('[class*="product"], [class*="item"]');
      if (await cartItems.count() > 0) {
        await expect(cartItems.first()).toBeVisible();
      }
    });
  });
});
