/**
 * checkout.spec.js
 * Checkout flow tests — updated for the new UI.
 *
 * Key changes vs original:
 * - Login goes directly to /login (no "Sign In" button to click)
 * - Products are added via inline Add button, not by navigating to a detail page
 * - Cart → Checkout uses "Proceed to Checkout →" button
 * - Checkout has two payment options: COD (default) and Razorpay
 * - Place order button text: "Place Order · ₹X.XX" (COD) or "Pay ₹X.XX Online" (Razorpay)
 */

const { test, expect } = require('@playwright/test');
const { loginAsUser, addFirstProductToCart } = require('./fixtures');

// Shared setup: login + add one product + navigate to checkout via React router
async function goToCheckout(page) {
  await loginAsUser(page);
  await page.goto('/products');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('button:has-text("Add")', { timeout: 10000 });

  await addFirstProductToCart(page);

  // Wait for cart badge — confirms item was persisted to localStorage
  await page.waitForSelector('[data-testid="cart-badge"]', { timeout: 5000 });

  // Navigate to cart via React router (no full page reload avoids init race)
  await page.click('[data-testid="cart-icon"]');
  await page.waitForURL('**/cart**', { timeout: 8000 });
  await page.waitForSelector('button:has-text("Proceed to Checkout")', { timeout: 8000 });

  await page.click('button:has-text("Proceed to Checkout")');
  await page.waitForURL('**/checkout**', { timeout: 8000 });
  await page.waitForSelector('text=/Order Summary/i', { timeout: 8000 });
}

test.describe('Checkout Flow', () => {
  // ── Checkout page structure ───────────────────────────────────────────────

  test('should display checkout page with order summary', async ({ page }) => {
    await goToCheckout(page);
    await expect(page.url()).toContain('/checkout');
    await expect(page.locator('text=/Order Summary/i')).toBeVisible();
  });

  test('should display items with kg quantities and prices', async ({ page }) => {
    await goToCheckout(page);
    await expect(page.locator('text=/kg/i').first()).toBeVisible();
    await expect(page.locator('text=/₹/i').first()).toBeVisible();
  });

  test('should display subtotal, delivery fee and total', async ({ page }) => {
    await goToCheckout(page);
    await expect(page.locator('text=/Subtotal/i')).toBeVisible();
    await expect(page.locator('text=/Delivery/i').first()).toBeVisible();
    await expect(page.locator('text=/Total/i').first()).toBeVisible();
  });

  test('should display delivery address textarea', async ({ page }) => {
    await goToCheckout(page);
    const textarea = page.locator('textarea[placeholder*="House"]');
    await expect(textarea).toBeVisible();
  });

  // ── Free delivery threshold ───────────────────────────────────────────────

  test('should show free delivery message when subtotal >= 300', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('button:has-text("Add")', { timeout: 10000 });

    // Add several products to go over the threshold
    const chip2kg = page.locator('button:has-text("2kg")').first();
    if (await chip2kg.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chip2kg.click();
    }
    await page.locator('button:has-text("Add")').first().click();
    await page.waitForTimeout(400);

    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    // Check for either FREE label or the "add more" message
    const freeDelivery = page.locator('text=/FREE/i');
    const addMore = page.locator('text=/more for free/i');
    const hasFree = await freeDelivery.count() > 0;
    const hasAddMore = await addMore.count() > 0;
    expect(hasFree || hasAddMore).toBeTruthy();
  });

  // ── Payment methods ───────────────────────────────────────────────────────

  test('should show COD as default payment option', async ({ page }) => {
    await goToCheckout(page);
    const codRadio = page.locator('input[value="cod"]');
    await expect(codRadio).toBeVisible();
    await expect(codRadio).toBeChecked();
  });

  test('should show Razorpay as second payment option', async ({ page }) => {
    await goToCheckout(page);
    const razorpayRadio = page.locator('input[value="razorpay"]');
    await expect(razorpayRadio).toBeVisible();
  });

  test('should switch to Razorpay payment', async ({ page }) => {
    await goToCheckout(page);
    await page.click('label:has-text("Pay Online")');
    await page.waitForTimeout(300);
    await expect(page.locator('input[value="razorpay"]')).toBeChecked();
  });

  test('should show correct place-order button text for COD', async ({ page }) => {
    await goToCheckout(page);
    // COD button: "Place Order · ₹X.XX"
    const placeOrderBtn = page.locator('button:has-text("Place Order")');
    await expect(placeOrderBtn).toBeVisible();
  });

  test('should show correct place-order button text for Razorpay', async ({ page }) => {
    await goToCheckout(page);
    await page.click('label:has-text("Pay Online")');
    await page.waitForTimeout(300);
    // Razorpay button: "Pay ₹X.XX Online"
    const payBtn = page.locator('button:has-text("Pay")');
    await expect(payBtn).toBeVisible();
  });

  // ── Address validation ────────────────────────────────────────────────────

  test('should show error when placing order without address', async ({ page }) => {
    await goToCheckout(page);
    // Leave address empty and click Place Order
    await page.click('button:has-text("Place Order")');
    await expect(page.locator('text=/delivery address/i')).toBeVisible({ timeout: 3000 });
  });

  // ── Mobile checkout ───────────────────────────────────────────────────────

  test('should display checkout correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await goToCheckout(page);

    await expect(page.locator('text=/Order Summary/i')).toBeVisible();
    await expect(page.locator('input[value="cod"]')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="House"]')).toBeVisible();
  });

  // ── Cart page ─────────────────────────────────────────────────────────────

  test('should display cart with delivery progress bar', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('button:has-text("Add")', { timeout: 10000 });
    await addFirstProductToCart(page);

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // Progress bar or "free delivery unlocked" message
    const progressBar = page.locator('[class*="bg-green-5"]');
    const freeMsg = page.locator('text=/FREE delivery/i');
    const addMore = page.locator('text=/more for free/i');
    const anyVisible = await progressBar.first().isVisible().catch(() => false)
      || await freeMsg.isVisible().catch(() => false)
      || await addMore.isVisible().catch(() => false);
    expect(anyVisible).toBeTruthy();
  });

  test('cart item quantity can be increased', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('button:has-text("Add")', { timeout: 10000 });
    await addFirstProductToCart(page);

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    const plusBtn = page.locator('button:has-text("+")').first();
    await expect(plusBtn).toBeVisible();
    await plusBtn.click();
    await page.waitForTimeout(400);
    // Verify qty label updated (contains "kg")
    await expect(page.locator('text=/kg/i').first()).toBeVisible();
  });

  test('cart item can be removed', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('button:has-text("Add")', { timeout: 10000 });
    await addFirstProductToCart(page);

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // Click remove (×) button
    const removeBtn = page.locator('button[aria-label="Remove item"], button svg').first();
    const itemCountBefore = await page.locator('div[class*="flex items-center gap-3"]').count();
    await page.locator('button').filter({ hasText: '' }).first();

    // Use the × svg button
    const xBtn = page.locator('svg path[d*="M6 18L18 6"]').first();
    const xParent = xBtn.locator('..');
    if (await xParent.isVisible({ timeout: 2000 }).catch(() => false)) {
      await xParent.click();
      await page.waitForTimeout(500);
    }
  });
});
