/**
 * admin-dashboard.spec.js
 * Admin panel tests — updated for the current UI.
 *
 * Key changes vs original:
 * - Admin phone is 9999999999 / password admin123 (not the regular test user)
 * - Login goes directly to /login; admin is auto-redirected to /admin on success
 * - "View Store" button is a styled link in the admin header
 * - "Admin" button appears in the store header for admin users
 */

const { test, expect } = require('@playwright/test');
const { loginAsAdmin, ADMIN_PHONE, ADMIN_PASSWORD } = require('./fixtures');

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
  });

  // ── Dashboard landing ─────────────────────────────────────────────────────

  test('should land on /admin after admin login', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should display admin panel heading', async ({ page }) => {
    await expect(page.locator('text=/Admin Panel/i').first()).toBeVisible();
  });

  test('should display sidebar navigation', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Products")')).toBeVisible();
    await expect(page.locator('a:has-text("Orders")')).toBeVisible();
    await expect(page.locator('a:has-text("Users")')).toBeVisible();
  });

  test('should display stats cards on dashboard', async ({ page }) => {
    // Stats cards (Revenue, Orders, Customers, Products)
    const statsArea = page.locator('text=/Revenue|Orders|Customers|Products/i').first();
    await expect(statsArea).toBeVisible({ timeout: 8000 });
  });

  // ── View Store button ─────────────────────────────────────────────────────

  test('should display View Store button in admin header', async ({ page }) => {
    const viewStoreBtn = page.locator('a:has-text("View Store")');
    await expect(viewStoreBtn).toBeVisible();
  });

  test('View Store button navigates to the store', async ({ page }) => {
    await page.click('a:has-text("View Store")');
    await page.waitForURL(url => !url.href.includes('/admin'), { timeout: 8000 });
    // Should be on the products/store page
    await expect(page.locator('header')).toBeVisible();
  });

  // ── Products management ───────────────────────────────────────────────────

  test('should navigate to products page', async ({ page }) => {
    await page.click('a:has-text("Products")');
    await page.waitForURL('**/admin/products**', { timeout: 6000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/Product Management/i')).toBeVisible({ timeout: 8000 });
  });

  test('should display products table with data', async ({ page }) => {
    // Use React router navigation (sidebar) to avoid auth re-init on full page reload
    await page.click('a:has-text("Products")');
    await page.waitForURL('**/admin/products**', { timeout: 10000 });
    await page.waitForFunction(
      () => document.querySelector('table') || document.body.innerText.includes('No products'),
      { timeout: 15000 }
    );
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display Add New Product button', async ({ page }) => {
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button:has-text("Add New Product")')).toBeVisible({ timeout: 8000 });
  });

  test('should open Add Product modal', async ({ page }) => {
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Add New Product")');
    await page.waitForTimeout(500);
    await expect(page.locator('text=/Add New Product/i').nth(1)).toBeVisible();
  });

  test('should display Edit button for each product', async ({ page }) => {
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 8000 });
    const editBtn = page.locator('button:has-text("Edit")').first();
    await expect(editBtn).toBeVisible();
  });

  test('should open Edit modal for a product', async ({ page }) => {
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('button:has-text("Edit")', { timeout: 8000 });
    await page.click('button:has-text("Edit")');
    await page.waitForTimeout(500);
    await expect(page.locator('text=/Edit Product/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display stock +/- controls per product', async ({ page }) => {
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 8000 });
    // + button for stock
    const plusBtn = page.locator('button[title="Increase stock by 1"]').first();
    await expect(plusBtn).toBeVisible();
  });

  // ── Orders management ─────────────────────────────────────────────────────

  test('should navigate to orders page', async ({ page }) => {
    await page.click('a:has-text("Orders")');
    await page.waitForURL('**/admin/orders**', { timeout: 6000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/Order/i').first()).toBeVisible({ timeout: 8000 });
  });

  // ── Users management ──────────────────────────────────────────────────────

  test('should navigate to users page', async ({ page }) => {
    await page.click('a:has-text("Users")');
    await page.waitForURL('**/admin/users**', { timeout: 6000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/User/i').first()).toBeVisible({ timeout: 8000 });
  });

  // ── Analytics ─────────────────────────────────────────────────────────────

  test('should navigate to analytics page', async ({ page }) => {
    await page.click('a:has-text("Analytics")');
    await page.waitForURL('**/admin/analytics**', { timeout: 6000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/Analytics|Revenue/i').first()).toBeVisible({ timeout: 8000 });
  });

  // ── Admin button in store ─────────────────────────────────────────────────

  test('Admin button in store header links back to admin panel', async ({ page }) => {
    // Go to store
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Admin button should be visible for admin users
    const adminBtn = page.locator('a:has-text("Admin")').first();
    await expect(adminBtn).toBeVisible();
    await adminBtn.click();
    await page.waitForURL('**/admin**', { timeout: 6000 });
    await expect(page).toHaveURL(/\/admin/);
  });
});
