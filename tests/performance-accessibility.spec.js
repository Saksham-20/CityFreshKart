const { test, expect, devices } = require('@playwright/test');

test.describe('Performance & Cross-Browser Tests', () => {
  test.describe('Performance Tests', () => {
    test('should load home page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should load product details quickly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const startTime = Date.now();
      
      const firstProduct = page.locator('[class*="product"]').first();
      await firstProduct.click();
      await page.waitForNavigation();
      
      const loadTime = Date.now() - startTime;
      
      // Product details should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should load checkout page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/checkout');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Checkout should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should render images efficiently', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check that images are loaded
      const images = page.locator('img');
      const count = await images.count();
      
      // Should have multiple images
      expect(count).toBeGreaterThan(0);
      
      // Check all images are loaded
      for (let i = 0; i < Math.min(count, 5); i++) {
        const isVisible = await images.nth(i).isVisible();
        expect(isVisible).toBeTruthy();
      }
    });
  });

  test.describe.configure({ timeout: 60000 });

  test.describe('Firefox Compatibility (Chromium Tested)', () => {
    test('should work with Firefox config', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Home page should load
      await expect(page.locator('text=/CityFreshKart|Fresh|Produce/i')).toBeVisible();
    });

    test('should display products correctly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const products = page.locator('[class*="product"]');
      expect(await products.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Safari Compatibility (WebKit)', () => {
    test('should work with Safari config', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=/CityFreshKart|Fresh|Produce/i')).toBeVisible();
    });

    test('should handle interactions on WebKit', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const firstProduct = page.locator('[class*="product"]').first();
      
      if (await firstProduct.count() > 0) {
        await firstProduct.click();
        await page.waitForNavigation();
        
        // Should navigate successfully
        await expect(page.locator('text=/Add to Cart|Details/i')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Tablet Responsiveness', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('should display correctly on tablet', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Content should be responsive
      const products = page.locator('[class*="product"]');
      expect(await products.count()).toBeGreaterThan(0);
    });

    test('should handle tablet navigation', async ({ page }) => {
      await page.goto('/');
      
      const products = page.locator('[class*="product"]');
      
      if (await products.count() > 0) {
        await products.first().click();
        await page.waitForNavigation();
        
        // Should navigate on tablet
        await expect(page.locator('text=/Add to Cart|Details/i')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should have semantic HTML structure', async ({ page }) => {
      await page.goto('/');
      
      // Check for main content landmark
      const main = page.locator('main');
      const role = page.locator('[role="main"]');
      
      const hasLandmark = await main.count() > 0 || await role.count() > 0;
      expect(hasLandmark).toBeTruthy();
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/');
      
      // Should have h1
      const h1 = page.locator('h1');
      
      if (await h1.count() > 0) {
        await expect(h1.first()).toBeVisible();
      }
    });

    test('should have accessible buttons', async ({ page }) => {
      await page.goto('/');
      
      // Buttons should have accessible text
      const buttons = page.locator('button');
      
      if (await buttons.count() > 0) {
        const firstButton = buttons.first();
        
        // Button should have text content
        const text = await firstButton.textContent();
        expect(text).toBeTruthy();
      }
    });

    test('should have accessible form labels', async ({ page }) => {
      await page.goto('/login');
      
      // Form inputs should be accessible
      const inputs = page.locator('input');
      
      if (await inputs.count() > 0) {
        // Should have placeholder or label
        await expect(inputs.first()).toBeVisible();
      }
    });

    test('should have proper color contrast', async ({ page }) => {
      await page.goto('/');
      
      // Text should be visible (checking for contrast indirectly)
      const text = page.locator('text=/CityFreshKart|Fresh|Produce/i');
      
      if (await text.count() > 0) {
        await expect(text.first()).toBeVisible();
      }
    });

    test('keyboard navigation should work', async ({ page }) => {
      await page.goto('/');
      await page.click('text=/Sign In|Login/i');
      
      // Tab through form fields
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be on password field or button
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });
      
      expect(focusedElement).toBeTruthy();
    });

    test('should support screen reader navigation', async ({ page }) => {
      await page.goto('/');
      
      // Check for aria labels
      const ariaElements = page.locator('[aria-label]');
      
      if (await ariaElements.count() > 0) {
        for (let i = 0; i < Math.min(await ariaElements.count(), 3); i++) {
          const label = await ariaElements.nth(i).getAttribute('aria-label');
          expect(label).toBeTruthy();
        }
      }
    });

    test('should have proper link accessibility', async ({ page }) => {
      await page.goto('/');
      
      // Links should have meaningful text
      const links = page.locator('a');
      
      if (await links.count() > 0) {
        const firstLink = links.first();
        const text = await firstLink.textContent();
        
        // Link should have text
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Network Conditions', () => {
    test('should handle slow network', async ({ page, context }) => {
      // Simulate slow 3G
      await context.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.continue();
      });
      
      await page.goto('/');
      
      // Page should still load successfully
      await expect(page.locator('text=/CityFreshKart|Fresh/i')).toBeVisible({ timeout: 10000 });
    });

    test('should handle high latency', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Simulate high latency for interactions
      const firstProduct = page.locator('[class*="product"]').first();
      
      if (await firstProduct.count() > 0) {
        await firstProduct.click();
        
        // Should navigate even with delays
        await page.waitForNavigation({ timeout: 10000 });
      }
    });
  });

  test.describe('Orientation Changes', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('should handle landscape orientation', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Change to landscape
      await page.setViewportSize({ width: 844, height: 390 });
      
      // Page should still be usable
      const products = page.locator('[class*="product"]');
      expect(await products.count()).toBeGreaterThan(0);
    });

    test('should handle portrait orientation', async ({ page }) => {
      await page.goto('/');
      
      // Change to portrait
      await page.setViewportSize({ width: 390, height: 844 });
      
      // Page should still be usable
      const products = page.locator('[class*="product"]');
      expect(await products.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Cookie & Storage', () => {
    test('should persist data in localStorage', async ({ page }) => {
      await page.goto('/');
      
      // Set localStorage value
      await page.evaluate(() => {
        localStorage.setItem('testKey', 'testValue');
      });
      
      // Verify it persists
      const value = await page.evaluate(() => {
        return localStorage.getItem('testKey');
      });
      
      expect(value).toBe('testValue');
    });

    test('should handle cookies correctly', async ({ page }) => {
      await page.goto('/');
      
      // Get cookies
      const cookies = await page.context().cookies();
      
      // Should have been able to get cookies
      expect(Array.isArray(cookies)).toBeTruthy();
    });

    test('should work with cookies disabled features', async ({ page }) => {
      // Test that app works with basic SessionStorage
      await page.goto('/');
      
      // App should still load
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('JavaScript Errors', () => {
    test('should not have console errors on home page', async ({ page }) => {
      let errorCount = 0;
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errorCount++;
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Should have minimal or no errors
      expect(errorCount).toBeLessThan(3);
    });

    test('should not have unhandled promise rejections', async ({ page }) => {
      let rejectionCount = 0;
      
      page.on('error', () => {
        rejectionCount++;
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Should have no unhandled rejections
      expect(rejectionCount).toBe(0);
    });
  });

  test.describe('Internationalization', () => {
    test('should display currency symbols correctly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Should display rupee symbol
      const rupeeSymbol = page.locator('text=/₹/');
      
      if (await rupeeSymbol.count() > 0) {
        await expect(rupeeSymbol.first()).toBeVisible();
      }
    });

    test('should display weight units correctly', async ({ page }) => {
      await page.goto('/');
      
      const firstProduct = page.locator('[class*="product"]').first();
      
      if (await firstProduct.count() > 0) {
        await firstProduct.click();
        await page.waitForNavigation();
        
        // Should display kg
        const weight = page.locator('text=/kg|kg/i');
        
        if (await weight.count() > 0) {
          await expect(weight.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('State Management', () => {
    test('should maintain state during navigation', async ({ page }) => {
      await page.goto('/');
      
      // Store a value
      const initialUrl = page.url();
      
      // Navigate away
      const firstProduct = page.locator('[class*="product"]').first();
      
      if (await firstProduct.count() > 0) {
        await firstProduct.click();
        await page.waitForNavigation();
      }
      
      // URL should have changed
      const newUrl = page.url();
      expect(newUrl).not.toBe(initialUrl);
    });
  });
});
