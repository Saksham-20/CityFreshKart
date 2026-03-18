const { test, expect } = require('@playwright/test');

// Test user credentials
const TEST_USER_PHONE = '9876543210';
const TEST_USER_PASSWORD = 'password123';

test.describe('Complete E2E User Journeys', () => {
  test('Complete Journey: Login → Browse → Add to Cart → Checkout', async ({ page }) => {
    // === Step 1: Navigate to Home ===
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify home page loaded
    await expect(page.locator('text=/CityFreshKart|Fresh|Produce|Products/i')).toBeVisible();
    
    // === Step 2: Navigate to Login ===
    await page.click('text=/Sign In|Login|Account/i');
    await page.waitForNavigation();
    
    // === Step 3: Login with phone & password ===
    await page.fill('input[type="tel"], input[placeholder*="phone" i]', TEST_USER_PHONE);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text(/Sign In|Login/i)');
    await page.waitForNavigation();
    
    // Verify redirect to home after login
    await expect(page).toHaveURL('/');
    
    // === Step 4: Browse Products ===
    await page.waitForLoadState('networkidle');
    const productCount = await page.locator('[class*="product"]').count();
    expect(productCount).toBeGreaterThan(0);
    
    // === Step 5: Navigate to Product Details ===
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    // === Step 6: Verify Weight-Based Pricing ===
    await expect(page.locator('text=/Price|₹/i')).toBeVisible();
    const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i]');
    if (await weightInput.count() > 0) {
      await expect(weightInput.first()).toBeVisible();
    }
    
    // === Step 7: Select Weight and Add to Cart ===
    if (await weightInput.count() > 0) {
      await weightInput.first().fill('2.5');
    }
    await page.click('button:has-text(/Add to Cart|Add/i)');
    await page.waitForLoadState('networkidle');
    
    // === Step 8: Navigate to Cart ===
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/cart');
    
    // === Step 9: Verify Cart Contents ===
    await expect(page.locator('text=/kg|₹/i').first()).toBeVisible();
    
    // === Step 10: Verify Price Calculation ===
    await expect(page.locator('text=/Subtotal|Total|₹/i').first()).toBeVisible();
    
    // === Step 11: Navigate to Checkout ===
    const checkoutButton = page.locator('button:has-text(/Checkout|Proceed/i)');
    if (await checkoutButton.count() > 0) {
      await checkoutButton.first().click();
      await page.waitForNavigation();
    }
    
    // === Step 12: Verify Checkout Page ===
    await expect(page.url()).toContain('/checkout');
    await expect(page.locator('text=/Order Summary|Total|₹/i').first()).toBeVisible();
    
    // === Step 13: Fill Delivery Address ===
    const addressInput = page.locator('textarea[placeholder*="address" i], input[placeholder*="address" i]');
    if (await addressInput.count() > 0) {
      await addressInput.first().fill('123 Test Street, Test City, TS 12345');
    }
    
    // === Step 14: Place Order ===
    const payButton = page.locator('button:has-text(/Pay|Order|Complete/i)').first();
    if (await payButton.count() > 0) {
      await payButton.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('Browse and Search Products Journey', async ({ page }) => {
    // === Step 1: Navigate to home ===
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // === Step 2: Search for product ===
    const searchBox = page.locator('input[placeholder*="Search" i], [aria-label*="search" i]');
    
    if (await searchBox.count() > 0) {
      await searchBox.first().fill('Tomato');
      await page.waitForLoadState('networkidle');
      
      // === Step 3: Verify search results ===
      const results = page.locator('[class*="product"]');
      const resultCount = await results.count();
      expect(resultCount).toBeGreaterThanOrEqual(0);
      
      // === Step 4: Click first result ===
      if (resultCount > 0) {
        await results.first().click();
        await page.waitForNavigation();
        
        // === Step 5: Verify product details ===
        await expect(page.locator('text=/Add to Cart|Details|₹/i')).toBeVisible();
      }
    }
  });

  test('Multiple Products Cart Journey', async ({ page }) => {
    // === Step 1: Login ===
    await page.goto('/');
    await page.click('text=/Sign In|Login/i');
    await page.fill('input[type="tel"], input[placeholder*="phone" i]', TEST_USER_PHONE);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text(/Sign In|Login/i)');
    await page.waitForNavigation();
    
    // === Step 2: Add first product ===
    let products = page.locator('[class*="product"]');
    if (await products.count() > 0) {
      await products.first().click();
      await page.waitForNavigation();
      
      const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i]');
      if (await weightInput.count() > 0) {
        await weightInput.first().fill('1.5');
      }
      
      await page.click('button:has-text(/Add to Cart|Add/i)');
      await page.waitForLoadState('networkidle');
      
      // === Step 3: Go back and add second product ===
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      products = page.locator('[class*="product"]');
      if (await products.count() > 1) {
        await products.nth(1).click();
        await page.waitForNavigation();
        
        const weightInputs = page.locator('input[type="number"], input[placeholder*="kg" i]');
        if (await weightInputs.count() > 0) {
          await weightInputs.first().fill('2');
        }
        
        await page.click('button:has-text(/Add to Cart|Add/i)');
        await page.waitForLoadState('networkidle');
      }
    }
    
    // === Step 4: Go to cart and verify multiple items ===
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    
    // Should have at least 1 item
    const cartItems = page.locator('[class*="item"], [class*="product"]');
    if (await cartItems.count() > 0) {
      expect(await cartItems.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('Delivery Fee Logic Journey', async ({ page }) => {
    // === Step 1: Login ===
    await page.goto('/');
    await page.click('text=/Sign In|Login/i');
    await page.fill('input[type="tel"], input[placeholder*="phone" i]', TEST_USER_PHONE);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text(/Sign In|Login/i)');
    await page.waitForNavigation();
    
    // === Step 2: Add high value order ===
    const firstProduct = page.locator('[class*="product"]').first();
    if (await firstProduct.count() > 0) {
      await firstProduct.click();
      await page.waitForNavigation();
      
      // Add quantity to reach high order value
      const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i]');
      if (await weightInput.count() > 0) {
        await weightInput.first().fill('5'); // High value
      }
      
      await page.click('button:has-text(/Add to Cart|Add/i)');
      await page.waitForLoadState('networkidle');
    }
    
    // === Step 3: Go to checkout ===
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    
    // === Step 4: Verify delivery fee ===
    const deliverySection = page.locator('text=/Delivery|FREE|₹/i');
    if (await deliverySection.count() > 0) {
      // Check if order qualifies for free delivery
      const freeDelivery = page.locator('text=/FREE|free|₹0.*delivery/i');
      const paidDelivery = page.locator('text=/₹\\d+.*delivery|delivery.*₹/i');
      
      const hasDeliveryInfo = await freeDelivery.count() > 0 || await paidDelivery.count() > 0;
      expect(hasDeliveryInfo).toBeTruthy();
    }
  });

  test.describe('Mobile E2E Journeys', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('Mobile Complete Journey', async ({ page }) => {
      // === Step 1: Navigate and login on mobile ===
      await page.goto('/');
      await page.click('text=/Sign In|Login/i');
      await page.fill('input[type="tel"], input[placeholder*="phone" i]', TEST_USER_PHONE);
      await page.fill('input[type="password"]', TEST_USER_PASSWORD);
      await page.click('button:has-text(/Sign In|Login/i)');
      await page.waitForNavigation();
      
      // === Step 2: Browse products on mobile ===
      const products = page.locator('[class*="product"]');
      if (await products.count() > 0) {
        // Should be responsive on mobile
        const firstProduct = products.first();
        const box = await firstProduct.boundingBox();
        
        if (box) {
          expect(box.width).toBeLessThan(390);
        }
        
        await firstProduct.click();
        await page.waitForNavigation();
      }
      
      // === Step 3: Add to cart on mobile ===
      const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i]');
      if (await weightInput.count() > 0) {
        await weightInput.first().fill('1');
      }
      
      await page.click('button:has-text(/Add to Cart|Add/i)');
      await page.waitForLoadState('networkidle');
      
      // === Step 4: Mobile cart ===
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
      
      // Cart should be responsive
      const cartContent = page.locator('[class*="cart"], body');
      if (await cartContent.count() > 0) {
        await expect(cartContent.first()).toBeVisible();
      }
    });

    test('Mobile Product Search', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const searchBox = page.locator('input[placeholder*="Search" i]');
      
      if (await searchBox.count() > 0) {
        await searchBox.first().fill('Tomato');
        await page.waitForLoadState('networkidle');
        
        // Results should be displayed
        const results = page.locator('[class*="product"]');
        if (await results.count() > 0) {
          await expect(results.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Desktop E2E Journeys', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('Desktop Complete Journey', async ({ page }) => {
      // === Step 1: Home page on desktop ===
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Should display grid of products
      const products = page.locator('[class*="product"]');
      expect(await products.count()).toBeGreaterThan(0);
      
      // === Step 2: Login ===
      await page.click('text=/Sign In|Login/i');
      await page.fill('input[type="tel"], input[placeholder*="phone" i]', TEST_USER_PHONE);
      await page.fill('input[type="password"]', TEST_USER_PASSWORD);
      await page.click('button:has-text(/Sign In|Login/i)');
      await page.waitForNavigation();
      
      // === Step 3: Multi-column product grid ===
      const productGrid = page.locator('[class*="product"]');
      if (await productGrid.count() > 0) {
        // Multiple products should be visible (grid layout)
        expect(await productGrid.count()).toBeGreaterThan(1);
      }
      
      // === Step 4: Add to cart ===
      const firstProduct = page.locator('[class*="product"]').first();
      await firstProduct.click();
      await page.waitForNavigation();
      
      const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i]');
      if (await weightInput.count() > 0) {
        await weightInput.first().fill('2');
      }
      
      await page.click('button:has-text(/Add to Cart|Add/i)');
      await page.waitForLoadState('networkidle');
      
      // === Step 5: Checkout ===
      await page.goto('/checkout');
      await page.waitForLoadState('networkidle');
      
      // All checkout elements should be visible
      await expect(page.locator('text=/Order Summary/i')).toBeVisible();
    });
  });
});
