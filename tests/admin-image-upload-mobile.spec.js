const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./fixtures');

function createBuffer(bytes, fill = 0x61) {
  return Buffer.alloc(bytes, fill);
}

async function ensureAtLeastOneProduct(page) {
  const noProducts = page.locator('text=No products found').first();
  if (!(await noProducts.isVisible().catch(() => false))) return;

  await page.locator('button:has-text("Add New Product")').click();
  await expect(page.locator('text=/Add New Product/i').first()).toBeVisible({ timeout: 10000 });

  const uniqueName = `PW Mobile Upload ${Date.now()}`;
  await page.fill('input[name="name"]', uniqueName);
  await page.fill('input[name="stock_quantity"]', '5');

  // First weight row and first price row in the custom tier section.
  await page.locator('input[placeholder*="0.75"], input[placeholder*="750"]').first().fill('1');
  await page.locator('input[placeholder="e.g. 59"]').first().fill('99');

  const categorySelect = page.locator('select[name="category"]');
  await expect(categorySelect).toBeVisible({ timeout: 10000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('select[name="category"]');
    return !!el && el.options.length > 1;
  }, null, { timeout: 10000 });
  await categorySelect.selectOption({ index: 1 });

  const createResponsePromise = page.waitForResponse((resp) => {
    return resp.request().method() === 'POST'
      && /\/api\/admin\/products$/.test(resp.url());
  }, { timeout: 25000 });

  await page.locator('button:has-text("Add Product")').click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBeLessThan(500);
  await expect(page.locator('text=/Product created successfully!/i').first()).toBeVisible({ timeout: 10000 });
}

test.describe('Admin Product Image Upload (Mobile)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');
  });

  test('rejects oversized image and accepts ~2.5MB update without HTTP 413', async ({ page }) => {
    await ensureAtLeastOneProduct(page);

    const editBtn = page.locator('button:has-text("Edit"):visible').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    await expect(page.locator('text=/Edit Product/i').first()).toBeVisible({ timeout: 10000 });

    const removeCurrentImage = page.locator('button:has-text("Remove image")').first();
    if (await removeCurrentImage.isVisible().catch(() => false)) {
      await removeCurrentImage.click();
    }

    const fileInput = page.locator('#img-edit');
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    // 5.5MB should be rejected client-side by admin file-size validation.
    await fileInput.setInputFiles({
      name: 'oversize-mobile-test.jpg',
      mimeType: 'image/jpeg',
      buffer: createBuffer(Math.floor(5.5 * 1024 * 1024)),
    });

    await expect(page.locator('text=/Image must be 5MB or smaller/i').first()).toBeVisible({ timeout: 8000 });

    // 2.5MB should submit successfully and not fail with 413.
    await fileInput.setInputFiles({
      name: 'valid-mobile-test.jpg',
      mimeType: 'image/jpeg',
      buffer: createBuffer(Math.floor(2.5 * 1024 * 1024), 0x62),
    });

    // Some seeded products have empty weight tier rows; fill one valid row to allow submit.
    const editWeightInput = page.locator('input[placeholder*="0.75"], input[placeholder*="750"]').first();
    const editPriceInput = page.locator('input[placeholder="e.g. 59"]').first();
    if ((await editWeightInput.inputValue()).trim() === '') {
      await editWeightInput.fill('1');
    }
    if ((await editPriceInput.inputValue()).trim() === '') {
      await editPriceInput.fill('99');
    }

    const updateResponsePromise = page.waitForResponse((resp) => {
      return resp.request().method() === 'PUT'
        && /\/api\/admin\/products\//.test(resp.url());
    }, { timeout: 60000 });

    const updateBtn = page.locator('button:has-text("Update Product")').first();
    await updateBtn.scrollIntoViewIfNeeded();
    await updateBtn.click({ force: true });
    const updateResponse = await updateResponsePromise;
    const status = updateResponse.status();

    expect(status).not.toBe(413);
    expect(status).toBeLessThan(500);

    await expect(page.locator('text=/Product updated successfully!/i').first()).toBeVisible({ timeout: 10000 });
  });
});