const { test as base } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Test credentials (created in database setup)
const TEST_USER_PHONE = '9876543210';
const TEST_USER_PASSWORD = 'password123';

// Create auth state storage
const authStoragePath = path.join(__dirname, '.auth');

if (!fs.existsSync(authStoragePath)) {
  fs.mkdirSync(authStoragePath, { recursive: true });
}

const authFile = path.join(authStoragePath, 'auth.json');

// Extend basic test by providing auth state
const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Check if we have a cached auth state
    if (fs.existsSync(authFile)) {
      const authState = JSON.parse(fs.readFileSync(authFile));
      // Add cookies and local storage from saved state
      if (authState.cookies) {
        await page.context().addCookies(authState.cookies);
      }
      if (authState.localStorage) {
        for (const [key, value] of Object.entries(authState.localStorage)) {
          await page.evaluate(({ k, v }) => {
            localStorage.setItem(k, v);
          }, { k: key, v: value });
        }
      }
    } else {
      // Perform login and save auth state
      await page.goto('/');
      await page.click('text=/Sign In|Login/i');
      
      await page.fill('input[placeholder*="phone" i], input[type="tel"]', TEST_USER_PHONE);
      await page.fill('input[type="password"]', TEST_USER_PASSWORD);
      await page.click('button:has-text(/Sign In|Login/i)');
      await page.waitForNavigation();
      
      // Save auth state
      const cookies = await page.context().cookies();
      const localStorage = await page.evaluate(() => {
        const items = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          items[key] = window.localStorage.getItem(key);
        }
        return items;
      });
      
      fs.writeFileSync(authFile, JSON.stringify({
        cookies,
        localStorage
      }, null, 2));
    }
    
    await use(page);
  }
});

module.exports = { test };
