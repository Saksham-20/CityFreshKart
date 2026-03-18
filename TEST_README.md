# CityFreshKart Playwright E2E Testing

## Overview
Comprehensive end-to-end tests for CityFreshKart using Playwright. Tests cover:
- **Authentication**: Phone+Password login & registration
- **Product Browsing**: Listing, searching, and filtering
- **Cart Management**: Add/remove items, weight selection (kg)
- **Checkout Flow**: Weight-based pricing, delivery fee calculation (✓ Free above ₹300)
- **Full E2E Journey**: Complete user workflow from login to order placement
- **Mobile Testing**: Responsive design validation on mobile devices

## Prerequisites

Make sure you have:
1. Node.js installed
2. Both server and client running or configured to run
3. Database setup: `npm run db:setup`
4. Sample products created in database

## Installation

```bash
# Install Playwright globally or locally
npm install

# Install Playwright browsers
npx playwright install
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Authentication tests
npm run test:auth

# Product browsing tests
npm run test:products

# Cart functionality tests
npm run test:cart

# Checkout flow tests
npm run test:checkout

# Complete E2E journey
npm run test:e2e
```

### Run Tests by Browser
```bash
# Chrome/Chromium
npm run test:chromium

# Firefox
npm run test:firefox

# Safari/WebKit
npm run test:webkit

# Mobile Chrome (Pixel 5)
npm run test:mobile
```

### Interactive Test Mode
```bash
# UI mode - watch tests in real-time
npm run test:ui

# Debug mode - step through tests
npm run test:debug
```

## Test Structure

### tests/auth.spec.js
Tests for phone+password authentication:
- Register new user with phone number
- Login with phone & password
- Form validation (phone format, password length)
- Session management

### tests/products.spec.js
Tests for product browsing:
- Home page product display
- Weight-based pricing display (₹/kg)
- Product detail navigation
- Search/filtering functionality
- Pagination

### tests/cart.spec.js
Tests for shopping cart:
- Add items to cart with weight selection
- View cart contents
- Update quantities
- Remove items
- Cart summary display

### tests/checkout.spec.js
Tests for checkout process:
- Order summary display
- Weight × price calculation
- Delivery fee logic (Free above ₹300)
- Delivery address input
- Razorpay payment method display
- Order total calculation

### tests/e2e.spec.js
Complete end-to-end user journey:
- Full flow: Login → Browse → Add to Cart → Checkout
- Mobile responsiveness test
- Delivery fee logic validation
- Error handling

## Test Data

### Test Account Credentials
- **Phone**: 9988776655
- **Password**: test123
- **Name**: E2E Test User

These are automatically created during `npm run db:setup`.

## Environment Setup

Tests expect:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Database**: PostgreSQL (as configured in .env)

Update `playwright.config.js` if your URLs differ.

## Key Test Features

### 1. Weight-Based Pricing Tests
```javascript
// Input weight in kg
await weightInput.fill('2.5');

// Validates quantity_kg × price_per_kg calculation
await expect(page.locator('text=₹')).toBeVisible();
```

### 2. Delivery Fee Logic Tests
```javascript
// Order < ₹300 = ₹50 delivery fee
// Order >= ₹300 = FREE delivery

// Test validates automatic calculation
if (subtotal >= 300) {
  await expect(page.locator('text=/FREE|₹0/i')).toBeVisible();
}
```

### 3. Mobile-First Testing
```javascript
// All tests run on mobile (Pixel 5) by default
await page.setViewportSize({ width: 390, height: 844 });

// Validates responsive design and WhatsApp-like UI
expect(boundingBox.width).toBeLessThanOrEqual(390);
```

### 4. Phone Number Authentication
```javascript
// Tests validate 10-digit phone format
await page.fill('input[placeholder*="Phone" i]', '8888888888');

// Password must be >= 6 characters
await page.fill('input[placeholder*="password" i]', 'test123');
```

## Troubleshooting

### Tests Timeout
**Cause**: Services not running
**Solution**:
```bash
# Start backend
npm run server

# In another terminal, start frontend
npm run client

# Then run tests
npm test
```

### Authentication Fails
**Cause**: Test user doesn't exist
**Solution**:
```bash
npm run db:setup
```

### Port Already in Use
**Cause**: Services still running from previous test
**Solution**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### Screenshot/Video Issues
Check `tests/playwright-report/` for failed test artifacts:
- Screenshots
- Video recordings
- HTML trace files

### Flaky Tests
Tests retry automatically (2x on CI, configurable locally). Common causes:
- Slow network - increase timeout: `test.setTimeout(60000)`
- Element not fully loaded - use `waitForLoadState('networkidle')`
- Race conditions - use proper locator waits

## Continuous Integration

GitHub Actions workflow (.github/workflows/test.yml):
```yaml
- name: Install Playwright
  run: npx playwright install

- name: Run E2E Tests
  run: npm test

- name: Upload Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Generate Test Report

After tests run, view the HTML report:

```bash
npx playwright show-report
```

This opens an interactive dashboard showing:
- Test results
- Pass/fail rates
- Timing information
- Screenshots for failures
- Video recordings
- Trace files for debugging

## Best Practices

1. **Use descriptive test names**: "should apply free delivery for orders above ₹300"
2. **Test user workflows**: Not individual components
3. **Wait properly**: Use `waitForLoadState('networkidle')` for API calls
4. **Mobile-first**: Design tests for mobile viewport first
5. **Meaningful assertions**: Check user-visible outcomes
6. **Data cleanup**: Use unique test data (phone numbers, etc.)

## Adding New Tests

Template:
```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: navigate, login, etc.
    await page.goto('/');
  });

  test('should perform specific action', async ({ page }) => {
    // Act: perform user actions
    await page.click('button');
    
    // Assert: verify outcomes
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

## Performance Testing

Monitor key metrics:
```javascript
// Measure page load time
const startTime = Date.now();
await page.goto('/');
const loadTime = Date.now() - startTime;
console.log(`Page load: ${loadTime}ms`);
```

## Security Testing

Tests validate:
- ✓ Phone number validation (10 digits only)
- ✓ Password requirements (min 6 characters)
- ✓ Authentication tokens in local storage
- ✓ Protected routes (redirects to login)
- ✓ Secure payment flow (Razorpay)

## Support

For issues or questions:
1. Check `tests/playwright-report/` for failure details
2. Review test logs with `node -e "console.log(process.cwd())"`
3. Run tests in debug mode: `npm run test:debug`
4. Check Playwright docs: https://playwright.dev

---

**Last Updated**: March 2026
**Version**: 1.0
