import { test, expect } from '@playwright/test';

async function login(page, phone: string, password: string) {
  await page.goto('/login');
  await page.fill('#phone', phone);
  await page.fill('#password', password);
  await page.locator('form button[type="submit"]').click();
}

async function dismissInstallPromptIfVisible(page) {
  const banner = page.locator('[data-testid="install-banner"]');
  if (await banner.isVisible()) {
    await banner.locator('button').nth(1).click();
  }
}

test('capture customer and admin mobile UI screenshots', async ({ page }) => {
  test.setTimeout(90000);
  await login(page, '9876543210', 'password123');
  await page.waitForURL(/\/(products)?(\?.*)?$/);
  await dismissInstallPromptIfVisible(page);

  await expect(page).toHaveURL(/\/(products)?(\?.*)?$/);
  await page.getByRole('button', { name: 'Add to Cart' }).first().click();
  await page.screenshot({ path: 'test-results/screenshots/mobile-products.png', fullPage: true });

  await page.locator('a[href="/cart"]').first().click();
  await page.waitForURL(/\/cart/);
  await dismissInstallPromptIfVisible(page);
  const proceedBtn = page.getByRole('button', { name: /Proceed to Checkout/i });
  if (await proceedBtn.count()) {
    await expect(proceedBtn).toBeVisible();
  }
  await page.screenshot({ path: 'test-results/screenshots/mobile-cart.png', fullPage: true });

  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await login(page, '9999999999', 'admin123');
  await page.waitForURL(/\/admin/);
  await page.goto('/admin/products');
  await page.waitForURL(/\/admin\/products/);
  await expect(page.getByRole('heading', { name: 'Product Management' })).toBeVisible();
  await page.screenshot({ path: 'test-results/screenshots/mobile-admin-products.png', fullPage: true });
});
