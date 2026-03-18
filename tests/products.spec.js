const { test, expect } = require('@playwright/test');

test.describe('Product Browsing & Management', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('/');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display home page with products', async ({ page }) => {
    // Check for main heading
    await expect(page.locator('text=/CityFreshKart|Fresh|Produce|Products/i')).toBeVisible();
    
    // Check for product grid/list
    const products = page.locator('[class*="product"]');
    await expect(products.first()).toBeVisible();
  });

  test('should display product list with prices', async ({ page }) => {
    // Look for products with prices
    const productItems = page.locator('text=/₹|Rs|rupees/i');
    
    // Should have at least one product with price
    const count = await productItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display product image', async ({ page }) => {
    // Check for product images
    const productImages = page.locator('[class*="product"] img, [class*="image"] img');
    await expect(productImages.first()).toBeVisible();
  });

  test('should display product name', async ({ page }) => {
    // Look for product names/titles
    await expect(page.locator('[class*="product"] [class*="name"], [class*="product"] [class*="title"], [class*="product-name"]').first()).toBeVisible();
  });

  test('should navigate to product details', async ({ page }) => {
    // Click on first product
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    
    // Wait for navigation and product details to load
    await page.waitForNavigation();
    
    // Should see product details
    await expect(page.locator('text=/Add to Cart|Details|Price|Description/i')).toBeVisible();
  });

  test('should display product details page', async ({ page }) => {
    // Navigate to product details
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    // Should show detailed product information
    await expect(page.locator('text=/Add to Cart|Add|Cart/i')).toBeVisible();
  });

  test('should display product with weight-based pricing', async ({ page }) => {
    // Navigate to product details
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    // Should show price per kg
    await expect(page.locator('text=/₹|Rs/i').first()).toBeVisible();
    
    // Should have weight selection option
    const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i], input[placeholder*="weight" i]');
    if (await weightInput.count() > 0) {
      expect(await weightInput.first().isVisible()).toBeTruthy();
    }
  });

  test('should display product description', async ({ page }) => {
    // Navigate to product details
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    // Should show description
    const description = page.locator('[class*="description"], p:not(:empty)');
    if (await description.count() > 0) {
      await expect(description.first()).toBeVisible();
    }
  });

  test('should show product discount if applicable', async ({ page }) => {
    // Look for discount badge or text
    const discounts = page.locator('text=/discount|off|save|% off|deal/i');
    
    if (await discounts.count() > 0) {
      await expect(discounts.first()).toBeVisible();
    }
  });

  test('should allow searching for products', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="Search" i], input[placeholder*="search" i], [aria-label*="search" i]');
    
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('Tomato');
      await page.waitForLoadState('networkidle');
      
      // Products should be filtered
      const results = page.locator('[class*="product"]');
      const count = await results.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should clear search and show all products', async ({ page }) => {
    // Search for product
    const searchInput = page.locator('input[placeholder*="Search" i]');
    
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('Tomato');
      await page.waitForLoadState('networkidle');
      
      // Clear search
      await searchInput.first().clear();
      await page.waitForLoadState('networkidle');
      
      // Should show products again
      const results = page.locator('[class*="product"]');
      const count = await results.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should allow filtering by category', async ({ page }) => {
    // Look for category filter
    const categoryFilter = page.locator('[class*="category"], [class*="filter"], [aria-label*="category" i]');
    
    if (await categoryFilter.count() > 0) {
      const firstCategory = categoryFilter.first();
      await firstCategory.click();
      await page.waitForLoadState('networkidle');
      
      // Results should be filtered
      const products = page.locator('[class*="product"]');
      await expect(products.first()).toBeVisible();
    }
  });

  test('should navigate between product pages', async ({ page }) => {
    // Look for pagination
    const nextButton = page.locator('button:has-text("Next"), a:has-text("Next"), [aria-label*="next" i]');
    
    if (await nextButton.count() > 0) {
      await nextButton.first().click();
      await page.waitForLoadState('networkidle');
      
      // Page should change
      const products = page.locator('[class*="product"]');
      await expect(products.first()).toBeVisible();
    }
  });

  test('should have working back button on product details', async ({ page }) => {
    // Navigate to product details
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    // Look for back button
    const backButton = page.locator('button:has-text(/Back|← Back/i), a:has-text(/Back|← Back/i)');
    
    if (await backButton.count() > 0) {
      await backButton.first().click();
      
      // Should go back to products list
      const products = page.locator('[class*="product"]');
      await expect(products.first()).toBeVisible();
    }
  });

  test('should display price per kg clearly', async ({ page }) => {
    // Navigate to product details
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    // Look for price per kg
    const pricePerKg = page.locator('text=/₹.*\/kg|₹.*per kg|price.*kg/i');
    
    if (await pricePerKg.count() > 0) {
      await expect(pricePerKg.first()).toBeVisible();
    }
  });

  test('should calculate total price based on weight', async ({ page }) => {
    // Navigate to product details
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    // Fill weight
    const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i]');
    if (await weightInput.count() > 0) {
      await weightInput.first().fill('2');
      
      // Total price should be displayed
      await expect(page.locator('text=/₹|Rs/i')).toBeVisible();
    }
  });

  test.describe('Mobile Product Browsing', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('should display products on mobile', async ({ page }) => {
      const products = page.locator('[class*="product"]');
      await expect(products.first()).toBeVisible();
    });

    test('should navigate to product details on mobile', async ({ page }) => {
      const firstProduct = page.locator('[class*="product"]').first();
      await firstProduct.click();
      
      await page.waitForNavigation();
      
      // Should see product details
      await expect(page.locator('text=/Add to Cart|Details/i')).toBeVisible();
    });

    test('should perform search on mobile', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search" i]');
      
      if (await searchInput.count() > 0) {
        await searchInput.first().fill('Tomato');
        await page.waitForLoadState('networkidle');
        
        const results = page.locator('[class*="product"]');
        const count = await results.count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });
});
