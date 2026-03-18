# CityFreshKart - Comprehensive Playwright Test Suite

This document outlines all the Playwright end-to-end tests created for the CityFreshKart application.

## Overview

A comprehensive test suite has been created covering all major user flows and functionality:

- ✅ **Authentication Tests** (auth.spec.js)
- ✅ **Product Browsing Tests** (products.spec.js)
- ✅ **Shopping Cart Tests** (cart.spec.js)
- ✅ **Checkout Tests** (checkout.spec.js)
- ✅ **Profile & Orders Tests** (profile-orders.spec.js)
- ✅ **Admin Dashboard Tests** (admin-dashboard.spec.js)
- ✅ **Error Handling Tests** (error-handling.spec.js)
- ✅ **End-to-End Journeys** (e2e.spec.js)

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm run test:auth              # Authentication tests
npm run test:products          # Product tests
npm run test:cart              # Cart tests
npm run test:checkout          # Checkout tests
npm run test:e2e               # End-to-end tests
```

### Run Tests in UI Mode
```bash
npm run test:ui
```

### Run Tests in Debug Mode
```bash
npm run test:debug
```

### Run Tests on Specific Browser
```bash
npm run test:chromium          # Chrome
npm run test:firefox           # Firefox
npm run test:webkit            # Safari
npm run test:mobile            # Mobile Chrome (Pixel 5)
```

### View Test Results
```bash
npm test              # Generates HTML report
# Open: playwright-report/index.html
```

## Test Suite Details

### 1. Authentication Tests (auth.spec.js)
**Coverage:**
- Navigate to login page
- Display login form with phone and password fields
- Validate phone format errors
- Validate incorrect password errors
- Successful login with correct credentials
- Login state persistence on page refresh
- Registration section display
- Register new user with valid data
- Validation errors for empty fields
- Logout functionality
- Mobile authentication flows

**Key Test Cases:** 15+

### 2. Product Browsing Tests (products.spec.js)
**Coverage:**
- Display home page with products
- Display product list with prices
- Display product images and names
- Navigate to product details
- Display weight-based pricing
- Display product descriptions
- Show product discounts
- Search functionality
- Search clearing
- Category filtering
- Pagination
- Back button navigation
- Price per kg display
- Total price calculation
- Mobile product browsing

**Key Test Cases:** 20+

### 3. Shopping Cart Tests (cart.spec.js)
**Coverage:**
- Add single product to cart
- Add multiple products to cart
- View cart with items
- Display cart item details
- Update item quantity
- Remove items from cart
- Display cart summary with totals
- Calculate correct total price
- Empty cart message
- Navigate to checkout
- Apply coupon/discount codes
- Mobile cart functionality

**Key Test Cases:** 15+

### 4. Checkout Tests (checkout.spec.js)
**Coverage:**
- Display checkout page with order summary
- Display product details in order summary
- Display weight-based pricing calculation
- Display delivery fee section
- Calculate delivery fee based on order value
- Show delivery address field
- Accept delivery address input
- Show payment method information
- Require delivery address before payment
- Display order total with all charges
- Show itemized breakdown
- Allow reviewing order before payment
- Display payment button
- Handle checkout with valid address
- Handle coupon/promo codes
- Allow editing cart before payment
- Display payment security info
- Mobile checkout flows
- Order calculation validation
- Free delivery for qualifying orders

**Key Test Cases:** 25+

### 5. Profile & Orders Tests (profile-orders.spec.js)
**Coverage:**
- Display user profile page
- Display user information
- Display user phone and details
- Allow editing user profile
- Display orders list
- Display order details
- Display order status
- Display order items details
- Display order total
- Display order tracking/status
- Allow filtering or sorting orders
- Display payment method for orders
- Display delivery address in order
- Allow cancelling order if applicable
- Show saved addresses
- Allow adding new address
- Mobile profile display
- Mobile orders display

**Key Test Cases:** 18+

### 6. Admin Dashboard Tests (admin-dashboard.spec.js)
**Coverage:**
- Display admin dashboard
- Display navigation menu
- Products management section
- Allow adding new product
- Display product list with actions
- Allow editing product
- Orders management section
- Display orders with details
- Allow updating order status
- Users management section
- Display users with actions
- Analytics/reports section
- Display stats/metrics
- Display total revenue
- Display total orders count
- Settings section
- Search functionality
- Pagination in lists
- Filter data
- Display logout option
- Admin analytics features

**Key Test Cases:** 22+

### 7. Error Handling Tests (error-handling.spec.js)
**Coverage:**
- Show error for 404 page
- Handle network errors gracefully
- Form validation errors:
  - Empty login form
  - Invalid phone format
  - Weak passwords
  - Missing checkout address
  - Empty cart checkout
- Session errors:
  - Expired sessions
  - Authentication failures
- Product errors:
  - Product not found
  - Out of stock products
  - Disabled add to cart for out of stock
- Cart errors:
  - Removing non-existent items
  - Quantity validation
- Payment errors and handling
- Rate limiting
- Data validation and XSS prevention
- Input sanitization

**Key Test Cases:** 30+

### 8. End-to-End Journey Tests (e2e.spec.js)
**Coverage:**

#### Complete Journey
- Login → Browse → Add to Cart → Checkout
- Multi-step validation
- Complete order flow

#### Product Search Journey
- Search for products
- View search results
- Navigate to details

#### Multiple Products Journey
- Add multiple products to cart
- Cart with multiple items

#### Delivery Fee Logic Journey
- Add high-value order
- Verify delivery fee calculation

#### Mobile Journeys (Pixel 5)
- Mobile complete flow
- Mobile product search
- Mobile responsiveness

#### Desktop Journeys (1280×720)
- Desktop complete flow
- Multi-column grid display

**Key Test Cases:** 10+

## Test Configuration

### Browser Coverage
- ✅ Chromium (Chrome)
- ✅ Firefox
- ✅ WebKit (Safari)
- ✅ Mobile Chrome (Pixel 5)

### Test Environment
- **Base URL:** http://localhost:3000
- **Server:** http://localhost:5000
- **Automatic webServer startup:** Yes
- **Screenshots:** On failure
- **Videos:** Retained on failure
- **Traces:** On first retry
- **HTML Report:** Yes

### Test Credentials
- **Phone:** 9876543210
- **Password:** password123

## Running Tests in CI/CD

```bash
# All tests with CI settings
npm test

# With coverage report
npm run test -- --reporter=html

# Specific project
npm run test:chromium
npm run test:mobile
```

## Test Statistics

| Category | Test Count |
|----------|-----------|
| Authentication | 15+ |
| Products | 20+ |
| Cart | 15+ |
| Checkout | 25+ |
| Profile/Orders | 18+ |
| Admin | 22+ |
| Error Handling | 30+ |
| E2E Journeys | 10+ |
| **TOTAL** | **155+** |

## Debugging Tests

### Run Single Test
```bash
npx playwright test tests/auth.spec.js -g "should login successfully"
```

### Debug Mode
```bash
npm run test:debug
```

### View HTML Report
```bash
# After running tests
npm test
# Opens report automatically or run:
npx playwright show-report
```

### Video & Screenshots
- Videos of failed tests: `test-results/`
- Screenshots of failures: `test-results/`
- HTML report: `playwright-report/`

## Best Practices

1. **Test Data:** Uses predefined test credentials (phone: 9876543210)
2. **Waits:** Proper `waitForLoadState` and `waitForNavigation` usage
3. **Selectors:** Mix of text, class, and aria-label selectors for resilience
4. **Mobile Testing:** Includes mobile viewport tests (390×844)
5. **Responsive:** Tests both mobile and desktop layouts
6. **Error Handling:** Comprehensive error scenario coverage
7. **Assertions:** Clear and specific expectations

## Performance Considerations

- **Parallel Execution:** Tests run in parallel by default
- **Mobile Chrome:** 1 worker for CI (mobile tests)
- **Retries:** 2 retries in CI mode
- **Timeout:** Default 30 seconds per test

## Coverage Areas

✅ **Authentication & Authorization**
- Login/Logout
- Registration
- Session management
- Password validation

✅ **Product Management**
- Browsing
- Search
- Filtering
- Weight-based pricing
- Product details

✅ **Shopping Cart**
- Add/Remove items
- Quantity updates
- Price calculations
- Multiple items

✅ **Checkout**
- Order summary
- Delivery address
- Delivery fee calculation
- Payment methods
- Order confirmation

✅ **User Profile**
- Profile information
- Order history
- Saved addresses
- Order management

✅ **Admin Functions**
- Dashboard
- Product management
- Order management
- User management
- Analytics

✅ **Error Scenarios**
- Form validation
- Network errors
- Invalid inputs
- Edge cases

✅ **Responsive Design**
- Mobile (390×844)
- Desktop (1280×720)
- Tablet (768×1024)

## Maintenance

### Adding New Tests
1. Create test file in `tests/` directory
2. Use existing imports and patterns
3. Follow naming convention: `feature.spec.js`
4. Add test to package.json scripts

### Updating Tests
- Update selectors if UI changes
- Add new test cases for new features
- Keep test data consistent
- Document significant changes

### Troubleshooting

**Tests timing out:**
- Increase `timeout` in playwright.config.js
- Check if servers are running

**Selectors not found:**
- Verify against actual UI
- Update selectors with browser DevTools
- Add fallback selectors

**Network errors:**
- Ensure API server is running
- Check network connectivity
- Review network interceptors

## Next Steps

1. Run all tests: `npm test`
2. View report: `npm test && npx playwright show-report`
3. Run specific suite: `npm run test:auth`
4. Debug with UI: `npm run test:ui`

## Support

For test issues or questions:
1. Check the test output and error messages
2. Review the HTML report
3. Check video/screenshots of failed tests
4. Update selectors if UI has changed
