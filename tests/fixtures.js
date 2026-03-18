const { test: base } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// ── Credentials ──────────────────────────────────────────────────────────────
const TEST_USER_PHONE    = '9876543210';
const TEST_USER_PASSWORD = 'password123';
const ADMIN_PHONE        = '9999999999';
const ADMIN_PASSWORD     = 'admin123';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Login as a regular user.
 * Navigates directly to /login (the app redirects there anyway).
 */
async function loginAsUser(page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  // Wait for the form to be fully interactive
  await page.waitForSelector('input[name="phone"]', { state: 'visible', timeout: 30000 });
  await page.fill('input[name="phone"]', TEST_USER_PHONE);
  await page.fill('input[name="password"]', TEST_USER_PASSWORD);
  await page.click('button[type="submit"]');
  // SPA client-side navigation after successful login — wait up to 30s
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 30000 });
}

/**
 * Login as admin.
 * After login the admin is auto-redirected to /admin.
 */
async function loginAsAdmin(page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="phone"]', { state: 'visible', timeout: 30000 });
  await page.fill('input[name="phone"]', ADMIN_PHONE);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  // Admin redirect can take a moment on cold start
  await page.waitForURL(url => url.href.includes('/admin'), { timeout: 30000 });
}

/**
 * Add the first available product to the cart using inline Add button.
 * Assumes the user is already on the products page.
 */
async function addFirstProductToCart(page) {
  // Weight chip — pick 0.5kg (first chip)
  const weightChip = page.locator('button', { hasText: '0.5kg' }).first();
  if (await weightChip.isVisible({ timeout: 3000 }).catch(() => false)) {
    await weightChip.click();
  }
  // Add button
  const addBtn = page.locator('button', { hasText: 'Add' }).first();
  await addBtn.waitFor({ state: 'visible', timeout: 5000 });
  await addBtn.click();
  await page.waitForTimeout(500);
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const test = base.extend({
  /**
   * authenticatedPage — regular user, already on /products after login
   */
  authenticatedPage: async ({ page }, use) => {
    await loginAsUser(page);
    await page.waitForLoadState('networkidle');
    await use(page);
  },

  /**
   * adminPage — admin user, already on /admin after login
   */
  adminPage: async ({ page }, use) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await use(page);
  },
});

module.exports = {
  test,
  loginAsUser,
  loginAsAdmin,
  addFirstProductToCart,
  TEST_USER_PHONE,
  TEST_USER_PASSWORD,
  ADMIN_PHONE,
  ADMIN_PASSWORD,
};
