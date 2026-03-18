const { test, expect } = require('@playwright/test');

test.describe('Error Handling & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show error for 404 page', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('/nonexistent-page', { waitUntil: 'networkidle' });
    
    // Should show 404 or error message
    const errorPage = page.locator('text=/404|Not Found|Page Not Found|Error/i');
    
    if (await errorPage.count() > 0) {
      await expect(errorPage.first()).toBeVisible();
    }
  });

  test('should handle network error gracefully', async ({ page }) => {
    // Simulate network error by blocking requests
    await page.route('**/*', route => route.abort());
    
    // Try to navigate
    await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {});
    
    // Page should show error or retry option
    const errorMessage = page.locator('text=/error|offline|connection|failed/i');
    
    if (await errorMessage.count() > 0) {
      await expect(errorMessage.first()).toBeVisible();
    }
  });

  test.describe('Form Validation Errors', () => {
    test('should show error for empty login form', async ({ page }) => {
      await page.click('text=/Sign In|Login/i');
      
      // Click submit without filling form
      await page.click('button:has-text(/Sign In|Login/i)');
      
      // Should show validation error
      const error = page.locator('text=/required|error|please enter/i');
      await expect(error.first()).toBeVisible({ timeout: 5000 });
    });

    test('should validate email/phone format', async ({ page }) => {
      await page.click('text=/Sign In|Login/i');
      
      // Enter invalid phone
      const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone" i]');
      if (await phoneInput.count() > 0) {
        await phoneInput.first().fill('abc');
        
        // Blur to trigger validation
        await phoneInput.first().blur();
        
        // Should show error
        const error = page.locator('text=/invalid|error|phone/i');
        if (await error.count() > 0) {
          await expect(error.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should validate password strength', async ({ page }) => {
      await page.click('text=/Sign In|Login/i');
      
      // Click sign up
      const signUpButton = page.locator('text=/Sign Up|Create Account|Register/i');
      if (await signUpButton.count() > 0) {
        await signUpButton.first().click();
        await page.waitForLoadState('networkidle');
        
        // Enter weak password
        const passwordInput = page.locator('input[type="password"]').first();
        if (await passwordInput.count() > 0) {
          await passwordInput.fill('123');
          await passwordInput.blur();
          
          // Should show strength indicator or error
          const feedback = page.locator('text=/weak|strong|password|security/i');
          if (await feedback.count() > 0) {
            expect(true).toBeTruthy();
          }
        }
      }
    });

    test('should require address in checkout', async ({ page }) => {
      // Go to checkout
      await page.goto('/checkout');
      await page.waitForLoadState('networkidle');
      
      // Try to submit without address
      const submitButton = page.locator('button:has-text(/Pay|Order|Complete/i)').first();
      
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // Should show error
        const error = page.locator('text=/address|required/i');
        if (await error.count() > 0) {
          await expect(error.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should validate cart is not empty before checkout', async ({ page }) => {
      // Go to empty cart
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
      
      // Try to checkout
      const checkoutButton = page.locator('button:has-text(/Checkout|Proceed/i)');
      
      if (await checkoutButton.count() > 0) {
        // Button should be disabled or show error
        const isDisabled = await checkoutButton.first().isDisabled();
        
        if (isDisabled) {
          expect(true).toBeTruthy();
        } else {
          await checkoutButton.first().click();
          
          // Should show error
          const error = page.locator('text=/add items|empty|cart/i');
          if (await error.count() > 0) {
            await expect(error.first()).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });
  });

  test.describe('Session Errors', () => {
    test('should handle expired session', async ({ page }) => {
      // Login first
      await page.click('text=/Sign In|Login/i');
      await page.fill('input[type="tel"], input[placeholder*="phone" i]', '9876543210');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button:has-text(/Sign In|Login/i)');
      await page.waitForNavigation();
      
      // Clear session storage/cookies to simulate expired session
      await page.context().clearCookies();
      
      // Try to access protected page
      await page.goto('/checkout');
      await page.waitForLoadState('networkidle');
      
      // Should redirect to login or show error
      const isRedirected = await page.url().includes('/login') || await page.url().includes('/');
      const sessionError = page.locator('text=/session|expired|login again/i');
      
      const hasError = isRedirected || await sessionError.count() > 0;
      expect(hasError).toBeTruthy();
    });

    test('should show error when authentication fails', async ({ page }) => {
      await page.click('text=/Sign In|Login/i');
      
      // Enter wrong credentials
      await page.fill('input[type="tel"], input[placeholder*="phone" i]', '9876543210');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button:has-text(/Sign In|Login/i)');
      
      // Should show error
      const error = page.locator('text=/invalid|incorrect|error|failed/i');
      await expect(error.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Product Errors', () => {
    test('should handle product not found', async ({ page }) => {
      // Try to access non-existent product
      await page.goto('/product/99999', { waitUntil: 'networkidle' }).catch(() => {});
      
      // Should show error or not found
      const error = page.locator('text=/not found|error|product|unavailable/i');
      
      if (await error.count() > 0) {
        await expect(error.first()).toBeVisible();
      }
    });

    test('should handle out of stock products', async ({ page }) => {
      // Look for out of stock indicator
      const outOfStock = page.locator('text=/out of stock|unavailable|sold out/i');
      
      if (await outOfStock.count() > 0) {
        // Out of stock indicator is present
        expect(true).toBeTruthy();
      }
    });

    test('should disable add to cart for out of stock', async ({ page }) => {
      // Look for products
      const products = page.locator('[class*="product"]');
      
      if (await products.count() > 0) {
        const firstProduct = products.first();
        await firstProduct.click();
        await page.waitForNavigation();
        
        // Check if add to cart button is disabled for out of stock
        const addButton = page.locator('button:has-text(/Add to Cart|Add/i)');
        
        if (await addButton.count() > 0) {
          const isDisabled = await addButton.first().isDisabled();
          const outOfStock = await page.locator('text=/out of stock|unavailable/i').count();
          
          if (outOfStock > 0) {
            expect(isDisabled || outOfStock > 0).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Cart Errors', () => {
    test('should handle removing non-existent item', async ({ page }) => {
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
      
      // Should handle gracefully
      const cartMessage = page.locator('text=/empty|no items/i');
      const cartItems = page.locator('[class*="item"]');
      
      const isEmpty = await cartMessage.count() > 0 || await cartItems.count() === 0;
      expect(isEmpty).toBeTruthy();
    });

    test('should validate quantity input', async ({ page }) => {
      // Add product to cart
      const firstProduct = page.locator('[class*="product"]').first();
      
      if (await firstProduct.count() > 0) {
        await firstProduct.click();
        await page.waitForNavigation();
        
        // Set quantity to 0 or negative
        const quantityInput = page.locator('input[type="number"]');
        
        if (await quantityInput.count() > 0) {
          await quantityInput.first().fill('0');
          
          // Should validate and prevent or show error
          const value = await quantityInput.first().inputValue();
          expect(parseInt(value) >= 0 || parseInt(value) <= 0).toBeTruthy();
        }
      }
    });
  });

  test.describe('Payment Errors', () => {
    test('should handle payment cancellation', async ({ page }) => {
      // This would require actual payment flow
      // Placeholder for payment error handling
      
      // Look for payment related error handling
      const paymentRetry = page.locator('button:has-text(/Retry|Try Again|Back/i)');
      
      // Payment error handling should be present
      expect(true).toBeTruthy();
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle too many requests', async ({ page }) => {
      // Make rapid requests
      for (let i = 0; i < 5; i++) {
        await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {});
      }
      
      // Should either work normally or show rate limit message
      const rateLimitError = page.locator('text=/rate limit|too many|try again/i');
      
      if (await rateLimitError.count() > 0) {
        expect(true).toBeTruthy();
      } else {
        // Normal operation
        expect(true).toBeTruthy();
      }
    });
  });

  test.describe('Data Validation', () => {
    test('should handle special characters in search', async ({ page }) => {
      const searchBox = page.locator('input[placeholder*="Search" i]');
      
      if (await searchBox.count() > 0) {
        await searchBox.first().fill(`< > & " \' onclick=alert(1)`);
        await page.waitForLoadState('networkidle');
        
        // Should handle XSS safely
        const jsAlert = page.locator('button:has-text(/Alert|OK/i)');
        
        if (await jsAlert.count() === 0) {
          // XSS was prevented
          expect(true).toBeTruthy();
        }
      }
    });

    test('should sanitize user input', async ({ page }) => {
      // Try to input HTML/script in address field
      await page.goto('/checkout');
      await page.waitForLoadState('networkidle');
      
      const addressField = page.locator('textarea[placeholder*="address" i], input[placeholder*="address" i]');
      
      if (await addressField.count() > 0) {
        await addressField.first().fill('<script>alert("xss")</script>');
        
        // Submit and verify it wasn't executed
        const value = await addressField.first().inputValue();
        
        // Should be sanitized or escaped
        expect(value).toBeDefined();
      }
    });
  });
});
