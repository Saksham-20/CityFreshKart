const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./fixtures');

async function ensureAtLeastOneOrder(page) {
  await page.goto('/admin/orders', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  let deleteButtons = page.getByRole('button', { name: 'Delete' });
  let deleteCount = await deleteButtons.count();
  if (deleteCount > 0) {
    return deleteCount;
  }

  await page.getByRole('button', { name: 'Create Order' }).click();
  await expect(page.getByPlaceholder('Customer phone (10 digits)')).toBeVisible({ timeout: 10000 });

  await page.getByPlaceholder('Customer phone (10 digits)').fill('9876543210');
  await page.getByPlaceholder('Delivery address').fill('Playwright Test Address, CityFreshKart QA');

  const productSelect = page.locator('select').last();
  await productSelect.selectOption({ index: 1 });

  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByPlaceholder('Customer phone (10 digits)')).toBeHidden({ timeout: 10000 });

  await page.waitForLoadState('networkidle');
  deleteButtons = page.getByRole('button', { name: 'Delete' });
  deleteCount = await deleteButtons.count();
  expect(deleteCount).toBeGreaterThan(0);
  return deleteCount;
}

async function verifyInstallBanner(page, testInfo, platformName) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  const installBanner = page.locator('#install-banner');
  if (platformName === 'android' && (await installBanner.count()) === 0) {
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      event.preventDefault = () => {};
      event.prompt = async () => {};
      event.userChoice = Promise.resolve({ outcome: 'dismissed' });
      window.dispatchEvent(event);
    });
  }
  await expect(installBanner).toBeVisible({ timeout: 15000 });

  await installBanner.screenshot({
    path: testInfo.outputPath(`${platformName}-install-banner.png`),
  });
}

async function verifyDeleteOrderFlow(page, testInfo, platformName) {
  await loginAsAdmin(page);
  await page.goto('/admin/orders', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  const beforeDeleteCount = await ensureAtLeastOneOrder(page);

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.getByRole('button', { name: 'Delete' }).first().click();

  await expect.poll(async () => page.getByRole('button', { name: 'Delete' }).count(), {
    timeout: 15000,
    message: `Expected one order to be deleted on ${platformName}`,
  }).toBe(beforeDeleteCount - 1);

  await page.screenshot({
    path: testInfo.outputPath(`${platformName}-orders-after-delete.png`),
    fullPage: false,
  });
}

test('install banner looks improved and admin can delete order', async ({ page }, testInfo) => {
  const platformName = testInfo.project.name;
  await verifyInstallBanner(page, testInfo, platformName);
  await verifyDeleteOrderFlow(page, testInfo, platformName);
});
