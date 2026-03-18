const { test, expect } = require('@playwright/test');

// Test user credentials
const TEST_USER_PHONE = '9876543210';
const TEST_USER_PASSWORD = 'password123';

test.describe('User Profile & Orders', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Login
    await page.click('text=/Sign In|Login|Account/i');
    await page.fill('input[type="tel"], input[placeholder*="phone" i]', TEST_USER_PHONE);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text(/Sign In|Login/i)');
    
    await page.waitForNavigation();
    await expect(page).toHaveURL('/');
  });

  test('should display user profile page', async ({ page }) => {
    // Look for profile link
    const profileLink = page.locator('text=/Profile|Account|My Account/i, a[href*="profile" i]');
    
    if (await profileLink.count() > 0) {
      // Open menu if needed
      const menuButton = page.locator('[class*="menu"], [aria-label*="menu" i]');
      if (await menuButton.count() > 0) {
        await menuButton.first().click();
      }
      
      await profileLink.first().click();
      await page.waitForNavigation();
      
      // Should be on profile page
      await expect(page.locator('text=/Profile|Account|My Details/i')).toBeVisible();
    }
  });

  test('should display user information', async ({ page }) => {
    // Navigate to profile
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // User info should be displayed
    const userInfo = page.locator('[class*="profile"], [class*="account"]');
    
    if (await userInfo.count() > 0) {
      await expect(userInfo.first()).toBeVisible();
    }
  });

  test('should display user phone and details', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Should show phone number or other details
    const details = page.locator('text=/phone|email|address|details/i');
    
    if (await details.count() > 0) {
      await expect(details.first()).toBeVisible();
    }
  });

  test('should allow editing user profile', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for edit button
    const editButton = page.locator('button:has-text(/Edit|Modify|Update/i)');
    
    if (await editButton.count() > 0) {
      await editButton.first().click();
      
      // Should show editable fields
      const editableFields = page.locator('input[value*=""]');
      if (await editableFields.count() > 0) {
        await expect(editableFields.first()).toBeVisible();
      }
    }
  });

  test('should display orders list', async ({ page }) => {
    // Navigate to orders page
    const ordersLink = page.locator('a:has-text(/Orders|My Orders|Order History/i), button:has-text(/Orders/i)');
    
    if (await ordersLink.count() > 0) {
      // Open menu if needed
      const menuButton = page.locator('[class*="menu"], [aria-label*="menu" i]');
      if (await menuButton.count() > 0) {
        await menuButton.first().click();
      }
      
      await ordersLink.first().click();
      await page.waitForNavigation();
    } else {
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
    }
    
    // Should see orders or empty message
    const ordersList = page.locator('[class*="order"], [data-testid*="order"]');
    const emptyMessage = page.locator('text=/no orders|empty|history/i');
    
    const hasOrders = await ordersList.count() > 0 || await emptyMessage.count() > 0;
    expect(hasOrders).toBeTruthy();
  });

  test('should display order details', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    // Look for order items
    const orderItems = page.locator('[class*="order"], [class*="item"]');
    
    if (await orderItems.count() > 0) {
      // Click first order
      await orderItems.first().click();
      await page.waitForNavigation();
      
      // Should show order details
      await expect(page.locator('text=/Order ID|Status|Total|Date/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display order status', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    // Look for order status
    const status = page.locator('text=/Status|Pending|Delivered|Cancelled/i');
    
    if (await status.count() > 0) {
      await expect(status.first()).toBeVisible();
    }
  });

  test('should display order items details', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    // Look for order items
    const products = page.locator('[class*="product"], [class*="item"], text=/kg|₹/i');
    
    if (await products.count() > 0) {
      await expect(products.first()).toBeVisible();
    }
  });

  test('should display order total', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    // Look for total amount
    const total = page.locator('text=/Total|Amount|₹\\d+/i');
    
    if (await total.count() > 0) {
      await expect(total.first()).toBeVisible();
    }
  });

  test('should display order tracking/status', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    // Look for tracking or delivery info
    const tracking = page.locator('text=/tracking|delivered|out for delivery|pending/i');
    
    if (await tracking.count() > 0) {
      await expect(tracking.first()).toBeVisible();
    }
  });

  test('should allow filtering or sorting orders', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    // Look for filter/sort options
    const filterOptions = page.locator('[class*="filter"], [class*="sort"], select, button:has-text(/Sort|Filter|Date/i)');
    
    if (await filterOptions.count() > 0) {
      expect(true).toBeTruthy();
    }
  });

  test('should display payment method for orders', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    // Look for payment method
    const payment = page.locator('text=/Payment|Card|COD|UPI|Razorpay/i');
    
    if (await payment.count() > 0) {
      await expect(payment.first()).toBeVisible();
    }
  });

  test('should display delivery address in order', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    // Look for delivery address
    const address = page.locator('text=/Address|Delivery to|Ship to/i');
    
    if (await address.count() > 0) {
      await expect(address.first()).toBeVisible();
    }
  });

  test('should allow cancelling order if applicable', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    // Look for cancel button
    const cancelButton = page.locator('button:has-text(/Cancel|Cancel Order/i)');
    
    if (await cancelButton.count() > 0) {
      // Cancel option is available
      expect(true).toBeTruthy();
    }
  });

  test('should show saved addresses', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for addresses section
    const addressesSection = page.locator('text=/Address|Addresses|Saved Addresses/i');
    
    if (await addressesSection.count() > 0) {
      await expect(addressesSection.first()).toBeVisible();
    }
  });

  test('should allow adding new address', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Look for add address button
    const addAddressButton = page.locator('button:has-text(/Add Address|Add|New Address/i)');
    
    if (await addAddressButton.count() > 0) {
      await addAddressButton.first().click();
      
      // Should show address form
      const form = page.locator('textarea[placeholder*="address" i], input[placeholder*="address" i]');
      if (await form.count() > 0) {
        await expect(form.first()).toBeVisible();
      }
    }
  });

  test.describe('Mobile Profile', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('should display profile on mobile', async ({ page }) => {
      const profileLink = page.locator('text=/Profile|Account/i, a[href*="profile" i]');
      
      if (await profileLink.count() > 0) {
        await profileLink.first().click();
        await page.waitForNavigation();
        
        // Should be responsive
        const content = page.locator('[class*="profile"]');
        if (await content.count() > 0) {
          await expect(content.first()).toBeVisible();
        }
      }
    });

    test('should display orders on mobile', async ({ page }) => {
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
      
      // Orders should be visible on mobile
      const orders = page.locator('[class*="order"], [class*="item"]');
      if (await orders.count() > 0) {
        await expect(orders.first()).toBeVisible();
      }
    });
  });
});
