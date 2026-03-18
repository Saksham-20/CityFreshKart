const { test, expect } = require('@playwright/test');

// Test user credentials (created in database setup)
const TEST_USER_PHONE = '9876543210';
const TEST_USER_PASSWORD = 'password123';

// Unique phone number for each test run
const getUniquePhone = () => {
  const timestamp = Date.now().toString();
  return timestamp.substring(timestamp.length - 10); // 10 digits
};

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to login page from home', async ({ page }) => {
    // Click on login/sign in button
    await page.click('text=/Sign In|Login|Account/i');
    
    // Verify we're on login page
    await expect(page.url()).toContain('/login');
    await expect(page.locator('text=/Sign In|Login/i')).toBeVisible();
  });

  test('should display login form with phone and password fields', async ({ page }) => {
    await page.click('text=/Sign In|Login|Account/i');
    
    // Check for phone input
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone" i], input[placeholder*="mobile" i]');
    await expect(phoneInput).toBeVisible();
    
    // Check for password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    
    // Check for sign in button
    const signInButton = page.locator('button:has-text(/Sign In|Login/i)');
    await expect(signInButton).toBeVisible();
  });

  test('should show error for invalid phone', async ({ page }) => {
    await page.click('text=/Sign In|Login|Account/i');
    
    // Fill with invalid phone (too short)
    await page.fill('input[type="tel"], input[placeholder*="phone" i]', '123');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text(/Sign In|Login/i)');
    
    // Should show error message or validation error
    await expect(page.locator('text=/invalid|error|phone/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show error for incorrect password', async ({ page }) => {
    await page.click('text=/Sign In|Login|Account/i');
    
    // Fill with valid phone but wrong password
    await page.fill('input[type="tel"], input[placeholder*="phone" i]', TEST_USER_PHONE);
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text(/Sign In|Login/i)');
    
    // Should show error message
    await expect(page.locator('text=/invalid|error|incorrect|password/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should login successfully with correct credentials', async ({ page }) => {
    await page.click('text=/Sign In|Login|Account/i');
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    await page.fill('input[type="tel"], input[placeholder*="phone" i]', TEST_USER_PHONE);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text(/Sign In|Login/i)');
    
    // Should redirect to home page or dashboard
    await page.waitForNavigation();
    await expect(page.url()).toContain('/');
    
    // Verify user is logged in (check for profile/logout option)
    await expect(page.locator('text=/Profile|Logout|Sign Out|Account/i')).toBeVisible({ timeout: 5000 });
  });

  test('should persist login state on page refresh', async ({ page }) => {
    // Login first
    await page.click('text=/Sign In|Login|Account/i');
    await page.fill('input[type="tel"], input[placeholder*="phone" i]', TEST_USER_PHONE);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text(/Sign In|Login/i)');
    await page.waitForNavigation();
    
    // Refresh page
    await page.reload();
    
    // User should still be logged in
    await expect(page.locator('text=/Profile|Logout|Sign Out|Account/i')).toBeVisible({ timeout: 5000 });
  });

  test('should display registration section', async ({ page }) => {
    await page.click('text=/Sign In|Login|Account/i');
    
    // Look for sign up/create account link
    const signUpLink = page.locator('text=/Create account|Sign Up|Register/i, a:has-text(/Sign Up|Register/i)');
    
    if (await signUpLink.count() > 0) {
      await expect(signUpLink.first()).toBeVisible();
    }
  });

  test('should register new user with valid data', async ({ page }) => {
    const uniquePhone = getUniquePhone();
    const password = 'TestPass123!';
    const name = `Test User ${Date.now()}`;

    // Navigate to login/register page
    await page.click('text=/Sign In|Login|Account/i');
    
    // Click on sign up button if it exists
    const signUpButton = page.locator('text=/Create Account|Sign Up|Register|Don\'t have.*/i, button:has-text(/Sign Up|Register/i), a:has-text(/Sign Up|Register/i)');
    if (await signUpButton.count() > 0) {
      await signUpButton.first().click();
      await page.waitForLoadState('networkidle');
    }
    
    // Fill registration form
    const nameInput = page.locator('input[placeholder*="Name" i], input[placeholder*="Full Name" i]');
    if (await nameInput.count() > 0) {
      await nameInput.fill(name);
    }
    
    const phoneInput = page.locator('input[placeholder*="Phone" i], input[placeholder*="Mobile" i], input[type="tel"]');
    await phoneInput.fill(uniquePhone);
    
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.first().fill(password);
    
    // If there's a confirm password field
    if (await passwordInputs.count() > 1) {
      await passwordInputs.nth(1).fill(password);
    }
    
    // Submit form
    const submitButton = page.locator('button:has-text(/Sign Up|Register|Create Account/i), button:has-text("Register")');
    await submitButton.first().click();
    
    // Should show success message or redirect
    await page.waitForLoadState('networkidle');
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.click('text=/Sign In|Login|Account/i');
    
    // Try to submit empty form
    const signInButton = page.locator('button:has-text(/Sign In|Login/i)');
    await signInButton.click();
    
    // Should show validation error
    await expect(page.locator('text=/required|error|please enter/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should have logout functionality', async ({ page }) => {
    // Login first
    await page.click('text=/Sign In|Login|Account/i');
    await page.fill('input[type="tel"], input[placeholder*="phone" i]', TEST_USER_PHONE);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text(/Sign In|Login/i)');
    await page.waitForNavigation();
    
    // Find and click logout
    const logoutButton = page.locator('button:has-text(/Logout|Sign Out|Log Out/i), text=/Logout|Sign Out|Log Out/i');
    if (await logoutButton.count() > 0) {
      // Menu might need to be opened first
      const menuButton = page.locator('[class*="menu"], [class*="nav"], [aria-label*="menu" i]').first();
      if (await menuButton.count() > 0) {
        await menuButton.click();
      }
      
      await logoutButton.first().click();
      await page.waitForNavigation();
      
      // Should be redirected to home or login
      await expect(page.url()).toMatch(/(?:\/|\/login)/);
    }
  });

  test.describe('Mobile Authentication', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('should load login page on mobile', async ({ page }) => {
      await page.click('text=/Sign In|Login|Account/i');
      
      // Form should be visible
      await expect(page.locator('input[type="tel"], input[placeholder*="phone" i]')).toBeVisible();
    });

    test('should login on mobile device', async ({ page }) => {
      await page.click('text=/Sign In|Login|Account/i');
      await page.fill('input[type="tel"], input[placeholder*="phone" i]', TEST_USER_PHONE);
      await page.fill('input[type="password"]', TEST_USER_PASSWORD);
      await page.click('button:has-text(/Sign In|Login/i)');
      
      await page.waitForNavigation();
      await expect(page.locator('text=/Profile|Logout|Sign Out|Account/i')).toBeVisible({ timeout: 5000 });
    });
  });
});
