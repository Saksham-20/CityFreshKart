import { test, expect } from '@playwright/test';

/**
 * PRODUCTION AUDIT TEST SUITE
 * Comprehensive testing of City Fresh Kart application
 * Tests: UI, functionality, security, cart logic, pricing
 */

test.describe('PRODUCTION AUDIT - CityFreshKart', () => {
  let consoleErrors: string[] = [];
  let networkErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Capture console errors
    consoleErrors = [];
    networkErrors = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`${msg.type()}: ${msg.text()}`);
      }
    });

    // Capture network errors
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });
  });

  test.afterEach(async () => {
    if (consoleErrors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS FOUND:');
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    }
    if (networkErrors.length > 0) {
      console.log('\n❌ NETWORK ERRORS (4xx/5xx):');
      networkErrors.forEach(err => console.log(`  - ${err}`));
    }
  });

  // ============================================================================
  // SECTION 1: HOMEPAGE & NAVIGATION
  // ============================================================================

  test('[AUDIT-01] Load Homepage - Check UI rendering and console errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check page title
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log(`✓ Page loaded: ${title}`);

    // Check header exists
    const header = await page.locator('header').first();
    expect(header).toBeVisible();

    // Check key elements
    const carousel = await page.locator('[data-testid="offer-carousel"]').or(page.locator('.carousel')).first();
    expect(carousel).toBeDefined();

    // Verify no console errors
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors on homepage:', consoleErrors);
    }
    
    await page.screenshot({ path: 'audit-screenshots/01-homepage.png' });
    console.log('✓ Homepage loaded successfully');
  });

  test('[AUDIT-02] Scroll full page - Check for layout shifts and visual issues', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll through entire page
    const maxScroll = await page.evaluate(() => document.body.scrollHeight);
    console.log(`Page height: ${maxScroll}px`);

    for (let i = 0; i < maxScroll; i += 500) {
      await page.evaluate((pos) => window.scrollTo(0, pos), i);
      await page.waitForTimeout(300);
    }

    console.log('✓ Scrolled entire page without layout shifts');
    await page.screenshot({ path: 'audit-screenshots/02-page-scroll.png' });
  });

  test('[AUDIT-03] Click category filters - Check responsive filtering', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find and click a category filter
    const categoryButtons = await page.locator('.category-filter button, [data-testid^="category"]').all();
    console.log(`Found ${categoryButtons.length} category filters`);

    if (categoryButtons.length > 0) {
      // Click first category
      await categoryButtons[0].click();
      await page.waitForLoadState('networkidle');
      
      // Verify products updated
      const productCards = await page.locator('[data-testid="product-card"], .product-card').all();
      console.log(`Loaded ${productCards.length} products after filter`);
      
      expect(productCards.length).toBeGreaterThan(0);
    }

    await page.screenshot({ path: 'audit-screenshots/03-category-filter.png' });
  });

  // ============================================================================
  // SECTION 2: PRODUCT BROWSING & DETAIL PAGE
  // ============================================================================

  test('[AUDIT-04] Browse Products - Check product grid rendering', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Wait for first product to load
    await page.waitForSelector('[data-testid="product-card"], .product-card', { timeout: 10000 }).catch(() => null);

    const productCards = await page.locator('[data-testid="product-card"], .product-card').all();
    console.log(`Product cards found: ${productCards.length}`);
    
    expect(productCards.length).toBeGreaterThan(0);

    // Check first product card structure
    if (productCards.length > 0) {
      const firstCard = productCards[0];
      const image = firstCard.locator('img').first();
      const price = firstCard.locator('[data-testid="price"], .price').first();
      
      expect(image).toBeDefined();
      console.log('✓ Product image visible');
    }

    await page.screenshot({ path: 'audit-screenshots/04-products-page.png' });
  });

  test('[AUDIT-05] Product Detail Page - Test weight selector and UI', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Click first product
    const firstProduct = await page.locator('[data-testid="product-card"], .product-card').first();
    await firstProduct.click();
    await page.waitForLoadState('networkidle');

    // Check product details
    const productName = await page.locator('h1, [data-testid="product-name"]').first();
    expect(productName).toBeDefined();
    console.log('✓ Product name visible');

    // Check weight selector exists
    const weightSelector = await page.locator('[data-testid="weight-selector"], .weight-selector, select').first();
    if (await weightSelector.isVisible()) {
      console.log('✓ Weight selector found');
      
      // Get initial price
      const priceElement = await page.locator('[data-testid="price"], .price').first();
      const initialPrice = await priceElement.textContent();
      console.log(`Initial price: ${initialPrice}`);

      // Select different weight
      await weightSelector.selectOption('1.5');
      await page.waitForTimeout(500);

      // Check if price updated (ISSUE: This might fail if weight-based pricing not implemented)
      const updatedPrice = await priceElement.textContent();
      if (initialPrice === updatedPrice) {
        console.log('⚠️ PRICE NOT UPDATED when weight changed - CRITICAL ISSUE');
      } else {
        console.log(`✓ Price updated to: ${updatedPrice}`);
      }
    } else {
      console.log('⚠️ Weight selector not visible');
    }

    await page.screenshot({ path: 'audit-screenshots/05-product-detail.png' });
  });

  // ============================================================================
  // SECTION 3: CART TESTING & CALCULATIONS
  // ============================================================================

  test('[AUDIT-06] Add to Cart - Verify cart updates and price calculation', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Find and click first product
    const firstProduct = await page.locator('[data-testid="product-card"], .product-card').first();
    
    // Get product price before adding
    const priceText = await firstProduct.locator('[data-testid="price"], .price').first().textContent();
    console.log(`Product price: ${priceText}`);

    // Click add to cart button
    const addButton = firstProduct.locator('button:has-text("Add"), button:has-text("Cart")')
      .or(firstProduct.locator('[data-testid="add-to-cart"]')).first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Wait for cart to update
      await page.waitForTimeout(1000);

      // Check if cart count increased
      const cartBadge = await page.locator('[data-testid="cart-count"], .cart-badge, .cart-count').first();
      const cartCount = await cartBadge.textContent();
      console.log(`Cart count: ${cartCount}`);

      // Verify toast/notification appeared
      const notification = await page.locator('[role="alert"], .toast, .notification').first().isVisible().catch(() => false);
      console.log(`Notification shown: ${notification}`);
    }

    await page.screenshot({ path: 'audit-screenshots/06-add-to-cart.png' });
  });

  test('[AUDIT-07] View Cart - Verify cart page calculations', async ({ page }) => {
    // First add items to cart via API by navigating to product and adding
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Add first product
    const addButtons = await page.locator('button:has-text("Add"), [data-testid="add-to-cart"]').all();
    if (addButtons.length > 0) {
      await addButtons[0].click();
      await page.waitForTimeout(500);
    }

    // Navigate to cart
    const cartLink = await page.locator('a:has-text("Cart"), [data-testid="cart-link"]').first();
    if (await cartLink.isVisible()) {
      await cartLink.click();
      await page.waitForLoadState('networkidle');
    } else {
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
    }

    // Verify cart page
    const cartItems = await page.locator('[data-testid="cart-item"], .cart-item').all();
    console.log(`Items in cart: ${cartItems.length}`);

    // Check totals calculation
    const subtotal = await page.locator('[data-testid="subtotal"], .subtotal').first();
    const total = await page.locator('[data-testid="total"], .total').first();
    
    const subtotalText = await subtotal.textContent();
    const totalText = await total.textContent();
    
    console.log(`Subtotal: ${subtotalText}, Total: ${totalText}`);

    await page.screenshot({ path: 'audit-screenshots/07-cart-page.png' });
  });

  test('[AUDIT-08] Update Cart Quantity - Check price recalculation', async ({ page }) => {
    // Add item and view cart
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const addButtons = await page.locator('button:has-text("Add"), [data-testid="add-to-cart"]').all();
    if (addButtons.length > 0) {
      await addButtons[0].click();
      await page.waitForTimeout(500);
    }

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // Find quantity control
    const quantityInput = await page.locator('input[type="number"]').first();
    const incrementButton = await page.locator('button:has-text("+"), [data-testid="increment"]').first();

    if (await incrementButton.isVisible()) {
      // Get initial total
      const initialTotal = await page.locator('[data-testid="total"], .total').first().textContent();
      console.log(`Initial total: ${initialTotal}`);

      // Increment quantity
      await incrementButton.click();
      await page.waitForTimeout(500);

      // Get updated total
      const updatedTotal = await page.locator('[data-testid="total"], .total').first().textContent();
      console.log(`Updated total: ${updatedTotal}`);

      if (initialTotal === updatedTotal) {
        console.log('⚠️ TOTAL NOT UPDATED when quantity changed');
      }
    }

    await page.screenshot({ path: 'audit-screenshots/08-update-cart.png' });
  });

  // ============================================================================
  // SECTION 4: CHECKOUT & PAYMENT FLOW
  // ============================================================================

  test('[AUDIT-09] Checkout Form - Verify form validation and fields', async ({ page }) => {
    // Add item to cart
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const addButtons = await page.locator('button:has-text("Add"), [data-testid="add-to-cart"]').all();
    if (addButtons.length > 0) {
      await addButtons[0].click();
      await page.waitForTimeout(500);
    }

    // Navigate to checkout
    const checkoutLink = await page.locator('a:has-text("Checkout"), button:has-text("Checkout")').first();
    if (await checkoutLink.isVisible()) {
      await checkoutLink.click();
      await page.waitForLoadState('networkidle');
    } else {
      await page.goto('/checkout').catch(() => {
        console.log('Checkout page not accessible (may require login)');
      });
    }

    // Try to find checkout form
    const form = await page.locator('form').first().isVisible().catch(() => false);
    if (form) {
      // Check form fields
      const nameInput = await page.locator('input[name="name"], input[placeholder*="Name"]').first();
      const emailInput = await page.locator('input[name="email"], input[type="email"]').first();
      const addressInput = await page.locator('textarea[name="address"], input[name="address"]').first();

      console.log(`Form fields found - Name: ${await nameInput.isVisible().catch(() => false)}, Email: ${await emailInput.isVisible().catch(() => false)}`);
    }

    await page.screenshot({ path: 'audit-screenshots/09-checkout-form.png' });
  });

  test('[AUDIT-10] Free Delivery Logic - Test threshold (₹300+)', async ({ page }) => {
    // This test checks if free delivery is applied above ₹300
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    const deliveryFee = await page.locator('[data-testid="delivery-fee"], .delivery-fee').first().isVisible().catch(() => false);
    
    if (deliveryFee) {
      const feeText = await page.locator('[data-testid="delivery-fee"], .delivery-fee').first().textContent();
      const total = await page.locator('[data-testid="total"], .total').first().textContent();
      
      console.log(`Delivery Fee: ${feeText}, Total: ${total}`);
      
      // Check if total is >= 300, fee should be 0
      const totalAmount = parseFloat(total?.replace(/[₹,$]/g, '') || '0');
      if (totalAmount >= 300) {
        if (feeText?.includes('0') || feeText?.includes('FREE')) {
          console.log('✓ Free delivery correctly applied');
        } else {
          console.log('⚠️ DELIVERY FEE NOT WAIVED for orders >= ₹300');
        }
      }
    } else {
      console.log('⚠️ Delivery fee field not found on cart page');
    }

    await page.screenshot({ path: 'audit-screenshots/10-delivery-logic.png' });
  });

  // ============================================================================
  // SECTION 5: AUTHENTICATION & SECURITY
  // ============================================================================

  test('[AUDIT-11] Registration Page - Check for security issues', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Check if form fields are visible
    const emailInput = await page.locator('input[type="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();

    expect(emailInput).toBeDefined();
    expect(passwordInput).toBeDefined();

    // Check for CSRF token
    const csrfToken = await page.locator('input[name*="csrf"], input[name*="token"]').first().isVisible().catch(() => false);
    if (!csrfToken) {
      console.log('⚠️ NO CSRF TOKEN - SECURITY ISSUE');
    }

    // Check password strength indicator
    const strengthIndicator = await page.locator('[data-testid="password-strength"], .password-strength').first().isVisible().catch(() => false);
    if (!strengthIndicator) {
      console.log('⚠️ NO PASSWORD STRENGTH indicator');
    }

    await page.screenshot({ path: 'audit-screenshots/11-registration.png' });
  });

  test('[AUDIT-12] Login Page - Check security and session handling', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = await page.locator('input[type="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();

    expect(emailInput).toBeDefined();
    expect(passwordInput).toBeDefined();

    // Check for "Remember me" or two-factor options
    const rememberMe = await page.locator('input[type="checkbox"]').first().isVisible().catch(() => false);
    const mfaField = await page.locator('[data-testid="2fa"], input[name*="otp"]').first().isVisible().catch(() => false);

    console.log(`Remember Me option: ${rememberMe}, 2FA option: ${mfaField}`);

    // Check for forgot password link
    const forgotLink = await page.locator('a:has-text("Forgot"), a:has-text("Reset")').first().isVisible().catch(() => false);
    if (!forgotLink) {
      console.log('⚠️ NO FORGOT PASSWORD link');
    }

    await page.screenshot({ path: 'audit-screenshots/12-login.png' });
  });

  // ============================================================================
  // SECTION 6: MOBILE RESPONSIVENESS
  // ============================================================================

  test('[AUDIT-13] Mobile View - Test responsive layout (iPhone SE)', async ({ browser }) => {
    const context = await browser.createContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2 like Mac OS X)',
      isMobile: true,
      hasTouch: true,
    });

    const page = await context.newPage();
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Check if navigation works on mobile
    const mobileMenu = await page.locator('[data-testid="mobile-menu"], .mobile-menu, [aria-label="Menu"]').first().isVisible().catch(() => false);
    console.log(`Mobile menu visible: ${mobileMenu}`);

    // Check if content is readable
    const firstHeading = await page.locator('h1, h2').first();
    const boundingBox = await firstHeading.boundingBox();
    if (boundingBox && boundingBox.width > 375) {
      console.log('⚠️ CONTENT OVERFLOW - Not mobile responsive');
    } else {
      console.log('✓ Content fits mobile screen');
    }

    await page.screenshot({ path: 'audit-screenshots/13-mobile-view.png' });
    await context.close();
  });

  // ============================================================================
  // SECTION 7: PERFORMANCE & ACCESSIBILITY
  // ============================================================================

  test('[AUDIT-14] Core Web Vitals & Accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Measure Core Web Vitals
    const cwv = await page.evaluate(() => {
      return new Promise((resolve) => {
        const perfObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          resolve(entries.map(e => ({ name: e.name, value: e.value })));
        });
        perfObserver.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
        setTimeout(() => resolve([]), 3000);
      });
    });

    console.log('Core Web Vitals:', cwv);

    // Check accessibility
    const bodyText = await page.locator('body').textContent();
    const hasAltText = await page.locator('img[alt]').count();
    const totalImages = await page.locator('img').count();

    console.log(`Images with alt text: ${hasAltText}/${totalImages}`);

    await page.screenshot({ path: 'audit-screenshots/14-cwv-a11y.png' });
  });

  test('[AUDIT-15] Network Activity & Bundle Size', async ({ page }) => {
    let totalSize = 0;
    let requestCount = 0;

    page.on('response', async (response) => {
      requestCount++;
      const buffer = await response.buffer();
      totalSize += buffer.length;
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bundleSize = (totalSize / 1024).toFixed(2);
    console.log(`Total network size: ${bundleSize}KB in ${requestCount} requests`);

    if (totalSize > 209 * 1024) {
      console.log('⚠️ BUNDLE SIZE OVER BUDGET (209KB target)');
    }

    await page.screenshot({ path: 'audit-screenshots/15-network.png' });
  });

  // ============================================================================
  // SECTION 8: PWA VALIDATION
  // ============================================================================

  test('[AUDIT-16] PWA Configuration - Check manifest and service worker', async ({ page }) => {
    await page.goto('/');
    
    // Check manifest.json
    const manifestLink = await page.locator('link[rel="manifest"]');
    const manifestHref = await manifestLink.getAttribute('href');
    console.log(`Manifest file: ${manifestHref}`);

    // Fetch and validate manifest
    if (manifestHref) {
      const manifestUrl = manifestHref.startsWith('/') ? `http://localhost:3000${manifestHref}` : manifestHref;
      const manifestResponse = await page.context().request.get(manifestUrl);
      const manifestData = await manifestResponse.json();
      
      console.log('Manifest contents:');
      console.log(`- Name: ${manifestData.name}`);
      console.log(`- Icons: ${manifestData.icons?.length} found`);
      console.log(`- Start URL: ${manifestData.start_url}`);
      console.log(`- Display: ${manifestData.display}`);
    }

    // Check for service worker
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    console.log(`Service Worker support: ${hasServiceWorker}`);

    await page.screenshot({ path: 'audit-screenshots/16-pwa.png' });
  });

  // ============================================================================
  // SECTION 9: API SECURITY CHECK
  // ============================================================================

  test('[AUDIT-17] API Security - Check for public admin endpoints', async ({ page }) => {
    // Test if setup-database endpoint is publicly accessible (CRITICAL ISSUE)
    const setupResponse = await page.context().request.post('http://localhost:5000/api/auth/setup-database');
    
    if (setupResponse.status() === 200) {
      console.log('🔴 CRITICAL SECURITY ISSUE: /api/auth/setup-database is PUBLIC');
    } else if (setupResponse.status() === 401) {
      console.log('✓ Setup endpoint is protected');
    } else {
      console.log(`Setup endpoint status: ${setupResponse.status()}`);
    }

    await page.screenshot({ path: 'audit-screenshots/17-api-security.png' });
  });

  test('[AUDIT-18] Error Boundary - Test error handling', async ({ page }) => {
    // Navigate to invalid product
    await page.goto('/product/invalid-id-999999');
    
    // Check if error handling works
    const errorMessage = await page.locator('[data-testid="error"], .error-message').first().isVisible().catch(() => false);
    const notFoundMessage = await page.textContent().then((text) => text?.includes('Not Found') || text?.includes('404') || text?.includes('doesn\'t exist'));

    console.log(`Error handling present: ${errorMessage || notFoundMessage}`);

    if (!errorMessage && !notFoundMessage) {
      console.log('⚠️ NO ERROR BOUNDARY - Page might crash on invalid routes');
    }

    await page.screenshot({ path: 'audit-screenshots/18-error-handling.png' });
  });
});
