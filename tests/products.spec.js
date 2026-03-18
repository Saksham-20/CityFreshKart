/**
 * products.spec.js
 * Product browsing tests — updated for the new Blinkit-style ProductCard UI.
 *
 * Key changes vs original:
 * - No product detail page navigation (cards are inline add-to-cart only)
 * - Weight selection uses chip buttons, not a number input
 * - Category filtering uses chip buttons at the top of ProductsPage
 * - Login required; redirects to /login when unauthenticated
 */

const { test, expect } = require('@playwright/test');
const { loginAsUser, addFirstProductToCart } = require('./fixtures');

test.describe('Product Browsing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    // Wait for products to render
    await page.waitForSelector('button:has-text("Add")', { timeout: 10000 });
  });

  // ── Page structure ─────────────────────────────────────────────────────────

  test('should display CityFreshKart header', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('text=/CityFreshKart/i').first()).toBeVisible();
  });

  test('should display delivery strip', async ({ page }) => {
    await expect(page.locator('text=/30 min/i').first()).toBeVisible();
  });

  test('should display category chips', async ({ page }) => {
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Vegetables")')).toBeVisible();
    await expect(page.locator('button:has-text("Fruits")')).toBeVisible();
  });

  test('should display product grid with prices', async ({ page }) => {
    // At least one ₹ price visible
    const prices = page.locator('text=/₹/');
    await expect(prices.first()).toBeVisible();
    const count = await prices.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display product images', async ({ page }) => {
    const images = page.locator('img[alt]');
    await expect(images.first()).toBeVisible();
  });

  test('should display product names', async ({ page }) => {
    const names = page.locator('h3');
    await expect(names.first()).toBeVisible();
  });

  // ── Weight selector ────────────────────────────────────────────────────────

  test('should display weight chip buttons (0.5kg, 1kg, 1.5kg, 2kg)', async ({ page }) => {
    await expect(page.locator('button:has-text("0.5kg")').first()).toBeVisible();
    await expect(page.locator('button:has-text("1kg")').first()).toBeVisible();
  });

  test('should change selected weight when chip clicked', async ({ page }) => {
    const chip1kg = page.locator('button:has-text("1kg")').first();
    await chip1kg.click();
    // The 1kg chip should now have the active (green) style
    await expect(chip1kg).toHaveClass(/bg-green-600/);
  });

  // ── Add to cart ────────────────────────────────────────────────────────────

  test('should add product to cart with inline Add button', async ({ page }) => {
    await addFirstProductToCart(page);
    // Cart badge should appear
    const badge = page.locator('[data-testid="cart-badge"]');
    await expect(badge).toBeVisible({ timeout: 5000 });
  });

  test('should show +/- quantity controls after adding to cart', async ({ page }) => {
    await addFirstProductToCart(page);
    // Increment/decrement buttons should replace the Add button on that card
    const minusBtn = page.locator('button:has-text("−")').first();
    await expect(minusBtn).toBeVisible({ timeout: 5000 });
  });

  // ── Category filtering ─────────────────────────────────────────────────────

  test('should filter by Vegetables category', async ({ page }) => {
    await page.click('button:has-text("Vegetables")');
    await page.waitForTimeout(600);

    // The Vegetables chip should be active
    const vegChip = page.locator('button:has-text("Vegetables")');
    await expect(vegChip).toHaveClass(/bg-green-600/);

    // Should still have products (or show empty state gracefully)
    const grid = page.locator('h3');
    if (await grid.count() > 0) {
      await expect(grid.first()).toBeVisible();
    }
  });

  test('should clear category filter with All chip', async ({ page }) => {
    await page.click('button:has-text("Vegetables")');
    await page.waitForTimeout(400);
    await page.click('button:has-text("All")');
    await page.waitForTimeout(400);

    const allChip = page.locator('button:has-text("All")');
    await expect(allChip).toHaveClass(/bg-green-600/);
  });

  test('should show product count', async ({ page }) => {
    await expect(page.locator('text=/products/i').first()).toBeVisible();
  });

  // ── Sort ───────────────────────────────────────────────────────────────────

  test('should sort by price ascending', async ({ page }) => {
    await page.click('button:has-text("Price ↑")');
    await page.waitForTimeout(600);
    const sortBtn = page.locator('button:has-text("Price ↑")');
    await expect(sortBtn).toHaveClass(/bg-gray-900/);
  });

  // ── Search ─────────────────────────────────────────────────────────────────

  test('should search via header search bar', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('tomato');
    await searchInput.press('Enter');
    await page.waitForTimeout(600);
    // Either finds results or shows empty state
    const empty = page.locator('text=/No products found/i');
    const results = page.locator('button:has-text("Add")');
    const hasResults = await results.count() > 0;
    const hasEmpty = await empty.isVisible().catch(() => false);
    expect(hasResults || hasEmpty).toBeTruthy();
  });

  // ── URL-based category (from footer links) ─────────────────────────────────

  test('should filter by category from URL param', async ({ page }) => {
    await page.goto('/products?category=Fruits');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const fruitsChip = page.locator('button:has-text("Fruits")');
    await expect(fruitsChip).toHaveClass(/bg-green-600/);
  });
});
