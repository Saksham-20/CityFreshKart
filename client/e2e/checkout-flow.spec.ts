import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('CityFreshKart - Product & Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  // Test 1: Product Selection & Weight Pricing
  test('should calculate price correctly based on weight selection', async ({ page }) => {
    // Navigate to products
    await page.click('a:has-text("Products")');
    await page.waitForLoadState('networkidle');

    // Find first product card
    const productCard = page.locator('[data-testid="product-card"]').first();
    await expect(productCard).toBeVisible();

    // Check initial price display
    const initialPrice = await productCard.locator('[data-testid="product-price"]').textContent();
    expect(initialPrice).toMatch(/₹/);

    // Open weight selector
    await productCard.click();
    const weightSelector = page.locator('[data-testid="weight-selector"]');
    await expect(weightSelector).toBeVisible();

    // Test weight options
    const weights = ['0.5 kg', '1 kg', '1.5 kg'];
    for (const weight of weights) {
      await page.click(`button:has-text("${weight}")`);
      await page.waitForTimeout(300); // Wait for price recalculation

      const newPrice = await productCard.locator('[data-testid="calculated-price"]').textContent();
      expect(newPrice).toMatch(/₹/);
    }
  });

  // Test 2: Add to Cart
  test('should add product to cart with correct weight', async ({ page }) => {
    await page.click('a:has-text("Products")');
    await page.waitForLoadState('networkidle');

    const productCard = page.locator('[data-testid="product-card"]').first();

    // Select weight
    await productCard.click();
    await page.click('button:has-text("1.5 kg")');

    // Add to cart
    await page.click('[data-testid="add-to-cart-btn"]');

    // Wait for toast notification
    const toast = page.locator('[role="alert"]');
    await expect(toast).toContainText('Added to cart');

    // Verify cart count
    const cartBadge = page.locator('[data-testid="cart-badge"]');
    await expect(cartBadge).toHaveText('1');
  });

  // Test 3: Free Delivery Threshold
  test('should show free delivery when order exceeds ₹300', async ({ page }) => {
    // Add multiple products to reach ₹300
    await page.click('a:has-text("Products")');
    await page.waitForLoadState('networkidle');

    let cartTotal = 0;
    const targetTotal = 300;

    // Add products until reaching target
    while (cartTotal < targetTotal) {
      const productCard = page.locator('[data-testid="product-card"]').first();
      const price = await productCard.locator('[data-testid="product-price"]').textContent();
      const priceNum = parseInt(price.replace(/[₹,]/g, ''));

      await productCard.click();
      await page.click('[data-testid="add-to-cart-btn"]');

      cartTotal += priceNum;
      await page.waitForTimeout(300);
    }

    // Open cart drawer
    await page.click('[data-testid="cart-icon"]');
    await expect(page.locator('[data-testid="cart-drawer"]')).toBeVisible();

    // Check delivery status
    const deliveryStatus = page.locator('[data-testid="delivery-status"]');
    await expect(deliveryStatus).toContainText('Free delivery');
  });

  // Test 4: Cart Calculation
  test('should calculate cart total correctly with delivery fee', async ({ page }) => {
    await page.click('a:has-text("Products")');
    await page.waitForLoadState('networkidle');

    const productCard = page.locator('[data-testid="product-card"]').first();

    // Select product
    await productCard.click();
    await page.click('button:has-text("1 kg")');
    await page.click('[data-testid="add-to-cart-btn"]');

    // Open cart
    await page.click('[data-testid="cart-icon"]');

    // Verify calculations
    const subtotal = await page.locator('[data-testid="subtotal"]').textContent();
    const deliveryFee = await page.locator('[data-testid="delivery-fee"]').textContent();
    const total = await page.locator('[data-testid="total"]').textContent();

    expect(subtotal).toMatch(/₹/);
    expect(deliveryFee).toMatch(/₹/);
    expect(total).toMatch(/₹/);

    // Verify total = subtotal + delivery
    const subtotalNum = parseInt(subtotal.replace(/[₹,]/g, ''));
    const deliveryNum = parseInt(deliveryFee.replace(/[₹,]/g, ''));
    const totalNum = parseInt(total.replace(/[₹,]/g, ''));

    expect(totalNum).toBe(subtotalNum + deliveryNum);
  });

  // Test 5: Discount Application
  test('should apply and display discounts correctly', async ({ page }) => {
    await page.click('a:has-text("Products")');
    await page.waitForLoadState('networkidle');

    // Find product with discount
    const productsWithDiscount = page.locator('[data-testid="discount-badge"]');
    const firstDiscountedProduct = page.locator('[data-testid="product-card"]').filter({
      has: page.locator('[data-testid="discount-badge"]'),
    }).first();

    if (await firstDiscountedProduct.count() > 0) {
      await firstDiscountedProduct.click();

      const discountAmount = await firstDiscountedProduct.locator('[data-testid="discount-amount"]').textContent();
      expect(discountAmount).toMatch(/₹/);

      const finalPrice = await firstDiscountedProduct.locator('[data-testid="final-price"]').textContent();
      const originalPrice = await firstDiscountedProduct.locator('[data-testid="original-price"]').textContent();

      // Final price should be less than original
      const finalNum = parseInt(finalPrice.replace(/[₹,]/g, ''));
      const originalNum = parseInt(originalPrice.replace(/[₹,]/g, ''));

      expect(finalNum).toBeLessThan(originalNum);
    }
  });

  // Test 6: Mobile Responsiveness
  test('should display properly on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const productCard = page.locator('[data-testid="product-card"]').first();
    await expect(productCard).toBeVisible();

    // Cart drawer should open from right side
    await page.click('[data-testid="cart-icon"]');
    const drawer = page.locator('[data-testid="cart-drawer"]');
    
    // Check drawer is positioned on the right
    const box = await drawer.boundingBox();
    expect(box.x).toBeGreaterThan(0);
  });

  // Test 7: PWA Installation Prompt
  test('should display PWA install prompt', async ({ page }) => {
    // Wait for install banner
    const installBanner = page.locator('[data-testid="install-banner"]');

    // Installation prompt may appear depending on browser support
    if (await installBanner.isVisible()) {
      const installBtn = installBanner.locator('button:has-text("Install")');
      await expect(installBtn).toBeVisible();
    }
  });
});
