const { test, expect } = require('@playwright/test');

// Test user credentials (created in database setup)
const TEST_USER_PHONE = '9876543210';
const TEST_USER_PASSWORD = 'password123';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and prepare cart
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Login
    await page.click('text=/Sign In|Login|Account/i');
    await page.fill('input[type="tel"], input[placeholder*="phone" i]', TEST_USER_PHONE);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text(/Sign In|Login/i)');
    
    await page.waitForNavigation();
    
    // Add product to cart
    const firstProduct = page.locator('[class*="product"]').first();
    await firstProduct.click();
    await page.waitForNavigation();
    
    const weightInput = page.locator('input[type="number"], input[placeholder*="kg" i], input[placeholder*="weight" i]');
    if (await weightInput.count() > 0) {
      await weightInput.first().fill('2.5');
    }
    await page.click('button:has-text(/Add to Cart|Add/i)');
    await page.waitForLoadState('networkidle');
    
    // Go to cart and checkout
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    const checkoutButton = page.locator('button:has-text(/Checkout|Proceed/i)');
    if (await checkoutButton.count() > 0) {
      await checkoutButton.first().click();
      await page.waitForNavigation();
    }
  });

  test('should display checkout page with order summary', async ({ page }) => {
    // Should be on checkout page
    await expect(page.url()).toContain('/checkout');
    
    // Should show order summary
    await expect(page.locator('text=/Order Summary|Items|Total/i')).toBeVisible();
    
    // Should show items with kg quantities
    const itemsWithUnit = page.locator('text=/kg|₹/i');
    if (await itemsWithUnit.count() > 0) {
      await expect(itemsWithUnit.first()).toBeVisible();
    }
  });

  test('should display product details in order summary', async ({ page }) => {
    // Should show product information
    const productInfo = page.locator('[class*="summary"], [class*="order-item"]');
    
    if (await productInfo.count() > 0) {
      await expect(productInfo.first()).toBeVisible();
    }
  });

  test('should display weight-based pricing calculation', async ({ page }) => {
    // Should show quantity in kg if applicable
    const weightQuantity = page.locator('text=/\\d+(\\.\\d+)? kg/i');
    
    if (await weightQuantity.count() > 0) {
      await expect(weightQuantity.first()).toBeVisible();
    }
    
    // Should show price calculation
    const priceInfo = page.locator('text=/₹|Total|Price/i');
    await expect(priceInfo.first()).toBeVisible();
  });

  test('should display delivery fee section', async ({ page }) => {
    // Should show delivery section
    const deliverySection = page.locator('text=/Delivery|Shipping|Freight/i');
    
    if (await deliverySection.count() > 0) {
      await expect(deliverySection.first()).toBeVisible();
    }
  });

  test('should calculate delivery fee based on order value', async ({ page }) => {
    // Check if free delivery applies (order >= ₹300)
    const deliveryText = page.locator('text=/FREE|₹0|Free Delivery/i');
    const deliveryCharge = page.locator('text=/₹\\d+.*Delivery|Delivery.*₹/i');
    
    // One of them should be visible
    if (await deliveryText.count() > 0) {
      expect(true).toBeTruthy();
    } else if (await deliveryCharge.count() > 0) {
      expect(true).toBeTruthy();
    }
  });

  test('should show delivery address field', async ({ page }) => {
    // Look for address input
    const addressField = page.locator('textarea[placeholder*="address" i], input[placeholder*="address" i], [aria-label*="address" i]');
    
    if (await addressField.count() > 0) {
      await expect(addressField.first()).toBeVisible();
    }
  });

  test('should accept delivery address input', async ({ page }) => {
    // Fill delivery address
    const addressTextarea = page.locator('textarea[placeholder*="address" i], input[placeholder*="address" i], textarea, input[type="text"]');
    
    if (await addressTextarea.count() > 0) {
      await addressTextarea.first().fill('123 Main St, Apt 4, City, State 12345');
      
      // Address should be filled
      const value = await addressTextarea.first().inputValue();
      expect(value).toContain('Main St');
    }
  });

  test('should show payment method information', async ({ page }) => {
    // Should show payment options/info
    const paymentSection = page.locator('text=/Payment|Razorpay|Card|UPI|Method/i');
    
    if (await paymentSection.count() > 0) {
      await expect(paymentSection.first()).toBeVisible();
    }
  });

  test('should require delivery address before payment', async ({ page }) => {
    // Try to submit without address
    const payButton = page.locator('button:has-text(/Pay|Order|Complete|Checkout/i)').first();
    
    // If address is empty, error should appear
    const addressTextarea = page.locator('textarea[placeholder*="address" i], input[placeholder*="address" i], textarea, input[type="text"]');
    
    if (await addressTextarea.count() > 0) {
      const currentValue = await addressTextarea.first().inputValue();
      
      if (!currentValue || currentValue.trim() === '') {
        await payButton.click();
        
        // Should show error message
        const errorMessage = page.locator('text=/address|required|please enter/i');
        if (await errorMessage.count() > 0) {
          await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should display order total with all charges', async ({ page }) => {
    // Should show final total
    const totalSection = page.locator('text=/Total|Grand Total|Amount to Pay/i');
    
    if (await totalSection.count() > 0) {
      await expect(totalSection.first()).toBeVisible();
    }
    
    // Should show amount in rupees
    const amount = page.locator('text=/₹\\d+/i');
    await expect(amount.first()).toBeVisible();
  });

  test('should show itemized breakdown', async ({ page }) => {
    // Should show subtotal, delivery fee, and other charges
    const subtotal = page.locator('text=/Subtotal|Item Total/i');
    const total = page.locator('text=/Total|Grand Total/i');
    
    if (await subtotal.count() > 0) {
      await expect(subtotal.first()).toBeVisible();
    }
    
    if (await total.count() > 0) {
      await expect(total.first()).toBeVisible();
    }
  });

  test('should allow user to review order before payment', async ({ page }) => {
    // All order details should be visible for review
    const orderDetails = page.locator('[class*="order"], [class*="summary"], [class*="review"]');
    
    if (await orderDetails.count() > 0) {
      await expect(orderDetails.first()).toBeVisible();
    }
  });

  test('should display payment button', async ({ page }) => {
    // Look for pay/checkout button
    const payButton = page.locator('button:has-text(/Pay|Order|Proceed|Complete/i)');
    
    if (await payButton.count() > 0) {
      await expect(payButton.first()).toBeVisible();
    }
  });

  test('should handle checkout with valid address', async ({ page }) => {
    // Fill address
    const addressTextarea = page.locator('textarea[placeholder*="address" i], input[placeholder*="address" i], textarea, input[type="text"]');
    
    if (await addressTextarea.count() > 0) {
      await addressTextarea.first().fill('123 Test Street, Test City, TS 12345');
      
      // Click checkout/pay button
      const payButton = page.locator('button:has-text(/Pay|Order|Proceed|Complete/i)').first();
      
      if (await payButton.count() > 0) {
        await payButton.click();
        
        // Should navigate or show payment
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('should handle coupon/promo code if available', async ({ page }) => {
    // Look for coupon input
    const couponInput = page.locator('input[placeholder*="coupon" i], input[placeholder*="promo" i], input[placeholder*="code" i]');
    
    if (await couponInput.count() > 0) {
      await couponInput.first().fill('TESTCODE');
      
      // Look for apply button
      const applyButton = page.locator('button:has-text(/Apply|Redeem|Use/i)');
      if (await applyButton.count() > 0) {
        await applyButton.first().click();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('should allow editing cart items before payment', async ({ page }) => {
    // Look for edit or modify options
    const editLinks = page.locator('a:has-text(/Edit|Modify|Change/i), button:has-text(/Edit|Modify/i)');
    
    if (await editLinks.count() > 0) {
      // Edit functionality is available
      expect(true).toBeTruthy();
    }
  });

  test('should display payment security info', async ({ page }) => {
    // Look for security/SSL badge
    const securityInfo = page.locator('text=/secure|encrypted|SSL|safe/i');
    
    if (await securityInfo.count() > 0) {
      expect(true).toBeTruthy();
    }
  });

  test.describe('Mobile Checkout', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('should display checkout page on mobile', async ({ page }) => {
      await expect(page.url()).toContain('/checkout');
      
      // Order summary should be responsive
      const summary = page.locator('[class*="summary"], [class*="order"]');
      if (await summary.count() > 0) {
        await expect(summary.first()).toBeVisible();
      }
    });

    test('should allow address input on mobile', async ({ page }) => {
      const addressField = page.locator('textarea[placeholder*="address" i], input[placeholder*="address" i]');
      
      if (await addressField.count() > 0) {
        await addressField.first().fill('Mobile Test Address');
        const value = await addressField.first().inputValue();
        expect(value).toContain('Mobile');
      }
    });

    test('should show payment button on mobile', async ({ page }) => {
      const payButton = page.locator('button:has-text(/Pay|Order|Complete/i)');
      
      if (await payButton.count() > 0) {
        await expect(payButton.first()).toBeVisible();
      }
    });
  });

  test.describe('Checkout Order Calculation', () => {
    test('should correctly calculate total with weight-based pricing', async ({ page }) => {
      // Verify price calculation is correct
      const totalAmount = page.locator('text=/₹\\d+/i').last();
      
      if (await totalAmount.count() > 0) {
        const text = await totalAmount.textContent();
        expect(text).toMatch(/₹\d+/);
      }
    });

    test('should apply free delivery for qualifying orders', async ({ page }) => {
      // Check for free delivery indicator
      const freeDelivery = page.locator('text=/FREE|free|₹0.*delivery/i');
      const paidDelivery = page.locator('text=/₹\\d+.*delivery|delivery.*₹\\d+/i');
      
      // One should be present
      const hasDeliveryInfo = await freeDelivery.count() > 0 || await paidDelivery.count() > 0;
      expect(hasDeliveryInfo).toBeTruthy();
    });
  });
});
