/**
 * basic-flow.spec.js
 *
 * Full screenshot tour of the CityFreshKart UI.
 * Covers every major page in both desktop (1280×800) and mobile (390×844) viewports.
 * All screenshots land in tests/screenshots/.
 *
 * Credentials
 *   Regular user : 9876543210 / password123
 *   Admin        : 9999999999 / admin123
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');
const { loginAsUser, loginAsAdmin, addFirstProductToCart } = require('./fixtures');

// Ensure the screenshots directory exists
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const shot = (name) => path.join(SCREENSHOTS_DIR, `${name}.png`);

// Helper: take a screenshot at the current viewport
async function capture(page, name) {
  await page.screenshot({ path: shot(name), fullPage: false });
}

// Helper: switch to mobile viewport
async function setMobile(page) {
  await page.setViewportSize({ width: 390, height: 844 });
}

// Helper: switch to desktop viewport
async function setDesktop(page) {
  await page.setViewportSize({ width: 1280, height: 800 });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Login page
// ─────────────────────────────────────────────────────────────────────────────
test('Screenshot — Login page (desktop + mobile)', async ({ page }) => {
  await setDesktop(page);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  // Wait for the login form to be ready (SPA may take a moment on first load)
  await page.waitForSelector('input[name="phone"]', { state: 'visible', timeout: 30000 });

  await expect(page.locator('h2', { hasText: 'Sign In' })).toBeVisible();
  await capture(page, '01-login-desktop');

  await setMobile(page);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await capture(page, '01-login-mobile');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Auth flow — sign up form
// ─────────────────────────────────────────────────────────────────────────────
test('Screenshot — Register form', async ({ page }) => {
  await setDesktop(page);
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Switch to register
  await page.click("button:has-text(\"Don't have an account\")");
  await page.waitForTimeout(400);
  await capture(page, '02-register-desktop');

  await setMobile(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, '02-register-mobile');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Products page — after login
// ─────────────────────────────────────────────────────────────────────────────
test('Screenshot — Products page (desktop + mobile)', async ({ page }) => {
  await setDesktop(page);
  await loginAsUser(page);
  await page.goto('/products');
  await page.waitForLoadState('networkidle');
  // Wait for at least one product card to render
  await page.waitForSelector('button:has-text("Add")', { timeout: 10000 });
  await capture(page, '03-products-desktop');

  await setMobile(page);
  await capture(page, '03-products-mobile');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Category filter
// ─────────────────────────────────────────────────────────────────────────────
test('Screenshot — Category chip filtering', async ({ page }) => {
  await setDesktop(page);
  await loginAsUser(page);
  await page.goto('/products');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('button:has-text("Vegetables")', { timeout: 8000 });

  // Click "Vegetables" category chip
  await page.click('button:has-text("Vegetables")');
  await page.waitForTimeout(600);
  await capture(page, '04-category-vegetables-desktop');

  await setMobile(page);
  await capture(page, '04-category-vegetables-mobile');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Add to cart
// ─────────────────────────────────────────────────────────────────────────────
test('Screenshot — Add product to cart', async ({ page }) => {
  await setDesktop(page);
  await loginAsUser(page);
  await page.goto('/products');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('button:has-text("Add")', { timeout: 10000 });

  await addFirstProductToCart(page);
  // Cart badge should now show a number
  await page.waitForSelector('[data-testid="cart-badge"]', { timeout: 5000 });
  await capture(page, '05-after-add-to-cart-desktop');

  await setMobile(page);
  await capture(page, '05-after-add-to-cart-mobile');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Cart — empty state
// ─────────────────────────────────────────────────────────────────────────────
test('Screenshot — Cart empty state', async ({ page }) => {
  await setDesktop(page);
  await loginAsUser(page);
  // Navigate to cart without adding anything (fresh session)
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');
  await capture(page, '06-cart-empty-desktop');

  await setMobile(page);
  await capture(page, '06-cart-empty-mobile');
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Cart — with items
// ─────────────────────────────────────────────────────────────────────────────
test('Screenshot — Cart with items', async ({ page }) => {
  await setDesktop(page);
  await loginAsUser(page);
  await page.goto('/products');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('button:has-text("Add")', { timeout: 10000 });

  await addFirstProductToCart(page);
  // Wait for cart badge to confirm item was added
  await page.waitForSelector('[data-testid="cart-badge"]', { timeout: 5000 });

  // Navigate to cart via header icon (React router, no full page reload)
  await page.click('[data-testid="cart-icon"]');
  await page.waitForURL('**/cart**', { timeout: 8000 });
  // Wait for cart items to render
  await page.waitForSelector('button:has-text("+")', { timeout: 8000 });
  await capture(page, '07-cart-items-desktop');

  await setMobile(page);
  await capture(page, '07-cart-items-mobile');
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Checkout page
// ─────────────────────────────────────────────────────────────────────────────
test('Screenshot — Checkout page', async ({ page }) => {
  await setDesktop(page);
  await loginAsUser(page);
  await page.goto('/products');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('button:has-text("Add")', { timeout: 10000 });

  await addFirstProductToCart(page);
  // Wait for cart badge
  await page.waitForSelector('[data-testid="cart-badge"]', { timeout: 5000 });

  // Navigate to cart via React router (avoids full reload / race condition)
  await page.click('[data-testid="cart-icon"]');
  await page.waitForURL('**/cart**', { timeout: 8000 });
  await page.waitForSelector('button:has-text("Proceed to Checkout")', { timeout: 8000 });

  // Proceed to checkout
  await page.click('button:has-text("Proceed to Checkout")');
  await page.waitForURL('**/checkout**', { timeout: 8000 });
  await page.waitForSelector('text=/Order Summary/i', { timeout: 8000 });
  await capture(page, '08-checkout-desktop');

  await setMobile(page);
  await capture(page, '08-checkout-mobile');
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Payment method selection on checkout
// ─────────────────────────────────────────────────────────────────────────────
test('Screenshot — Checkout payment options', async ({ page }) => {
  await setDesktop(page);
  await loginAsUser(page);
  await page.goto('/products');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('button:has-text("Add")', { timeout: 10000 });

  await addFirstProductToCart(page);
  await page.waitForSelector('[data-testid="cart-badge"]', { timeout: 5000 });

  // Navigate to cart then checkout via React router
  await page.click('[data-testid="cart-icon"]');
  await page.waitForURL('**/cart**', { timeout: 8000 });
  await page.waitForSelector('button:has-text("Proceed to Checkout")', { timeout: 8000 });
  await page.click('button:has-text("Proceed to Checkout")');
  await page.waitForURL('**/checkout**', { timeout: 8000 });
  await page.waitForSelector('text=/Payment Method/i', { timeout: 8000 });

  // Verify both payment options exist
  await expect(page.locator('input[value="cod"]')).toBeVisible();
  await expect(page.locator('input[value="razorpay"]')).toBeVisible();

  // Select Razorpay
  await page.click('label:has-text("Pay Online")');
  await page.waitForTimeout(300);
  await capture(page, '09-checkout-razorpay-selected-desktop');

  await setMobile(page);
  await capture(page, '09-checkout-razorpay-selected-mobile');
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Admin dashboard
// ─────────────────────────────────────────────────────────────────────────────
test('Screenshot — Admin dashboard', async ({ page }) => {
  await setDesktop(page);
  await loginAsAdmin(page);
  await page.waitForLoadState('networkidle');

  // Should be on /admin
  await expect(page).toHaveURL(/\/admin/);
  await capture(page, '10-admin-dashboard-desktop');

  await setMobile(page);
  await capture(page, '10-admin-dashboard-mobile');
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Admin products page
// ─────────────────────────────────────────────────────────────────────────────
test('Screenshot — Admin products page', async ({ page }) => {
  await setDesktop(page);
  await loginAsAdmin(page);
  // Use React router (sidebar link) to avoid a full page reload + auth re-init
  await page.click('a:has-text("Products")');
  await page.waitForURL('**/admin/products**', { timeout: 10000 });
  // Wait for table or loading state to resolve
  await page.waitForFunction(
    () => document.querySelector('table') || document.body.innerText.includes('No products'),
    { timeout: 15000 }
  );
  await capture(page, '11-admin-products-desktop');

  await setMobile(page);
  await capture(page, '11-admin-products-mobile');
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Admin — View Store button takes admin to store
// ─────────────────────────────────────────────────────────────────────────────
test('Admin "View Store" button navigates to store', async ({ page }) => {
  await setDesktop(page);
  await loginAsAdmin(page);
  await page.waitForLoadState('networkidle');

  // View Store link should be visible in admin header
  const viewStoreLink = page.locator('a:has-text("View Store")');
  await expect(viewStoreLink).toBeVisible();
  await viewStoreLink.click();

  await page.waitForURL(url => !url.href.includes('/admin'), { timeout: 8000 });
  await page.waitForLoadState('networkidle');
  await capture(page, '12-store-from-admin-desktop');
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Admin panel button visible in store header for admins
// ─────────────────────────────────────────────────────────────────────────────
test('Store header shows Admin button for admin users', async ({ page }) => {
  await setDesktop(page);
  await loginAsAdmin(page);

  // Navigate to store
  await page.goto('/products');
  await page.waitForLoadState('networkidle');

  // Admin button should be in header
  const adminBtn = page.locator('a:has-text("Admin")').first();
  await expect(adminBtn).toBeVisible();
  await capture(page, '13-store-header-admin-button-desktop');
});
