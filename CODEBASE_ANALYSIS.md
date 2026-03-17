# CityFreshKart Codebase Analysis Report

**Generated:** 17 March 2026  
**Focus Areas:** Test IDs, Component Structure, Weight Selection, Price Calculation

---

## 📊 EXECUTIVE SUMMARY

The E2E tests are looking for **16+ different data-testid attributes** but **ZERO data-testid attributes exist** in the actual UI components. This is a critical mismatch causing all tests to fail.

---

## 1️⃣ TEST IDs BEING SEARCHED FOR vs ACTUAL IMPLEMENTATION

### ❌ Test IDs Expected by E2E Tests

The following test IDs are referenced in `client/e2e/checkout-flow.spec.ts`:

| Test ID | Expected Location | Purpose | Status |
|---------|------------------|---------|--------|
| `product-card` | Product cards in listings | Identify product card DOM element | ❌ MISSING |
| `product-price` | Inside product card | Display product price | ❌ MISSING |
| `weight-selector` | Product card/Product detail | Weight selection dropdown | ❌ MISSING |
| `calculated-price` | Inside weight selector area | Dynamic price after weight change | ❌ MISSING |
| `add-to-cart-btn` | Bottom of product card | Add to cart button | ❌ MISSING |
| `cart-badge` | Nav/Header | Cart item count badge | ❌ MISSING |
| `cart-icon` | Header/Nav | Cart button/icon | ❌ MISSING |
| `cart-drawer` | Right/Left sidebar | Cart slide-out panel | ❌ MISSING |
| `delivery-status` | Cart drawer | Shows delivery fee status | ❌ MISSING |
| `subtotal` | Cart summary | Order subtotal display | ❌ MISSING |
| `delivery-fee` | Cart summary | Delivery fee display | ❌ MISSING |
| `total` | Cart summary | Final total display | ❌ MISSING |
| `discount-badge` | Product card overlay | Discount percentage badge | ❌ MISSING |
| `discount-amount` | Product card | Discount amount in rupees | ❌ MISSING |
| `final-price` | Product card/selector | Price after discount | ❌ MISSING |
| `original-price` | Product card | Price before discount | ❌ MISSING |

**Total Expected: 16 unique test IDs**  
**Total Found in Codebase: 0**

---

## 2️⃣ ALL COMPONENTS IN SRC/COMPONENTS/

### Component Directory Structure

```
src/components/
├── admin/              [Not listed - check if exists]
├── auth/
│   ├── AdminRoute.js
│   ├── LoginForm.js
│   ├── PasswordForm.js
│   ├── ProfileForm.js
│   ├── ProtectedRoute.js
│   └── RegisterForm.js
├── cart/
│   ├── CartDrawer.js
│   ├── CartDrawer.jsx
│   ├── CartItem.js
│   ├── CartSummary.js
│   └── CheckoutForm.js
├── common/
│   ├── Breadcrumb.js
│   ├── ErrorBoundary.js
│   ├── FilterSidebar.js
│   ├── LazyImage.js
│   ├── NewsletterSignup.js
│   ├── Pagination.js
│   └── SearchBar.js
├── home/
│   ├── CategoryFilter.js
│   └── OfferCarousel.js
├── layout/
│   ├── AdminLayout.js
│   ├── Footer.js
│   ├── Header.js
│   ├── MobileBottomNav.js
│   ├── MobileMenu.js
│   ├── Navbar.js
│   └── Navigation.js
├── product/
│   ├── ProductCard.js          ⚠️ (duplicate: also .jsx)
│   ├── ProductCard.jsx         ⚠️ (duplicate)
│   ├── ProductCardSkeleton.js
│   ├── ProductDetail.js
│   ├── ProductGrid.js
│   ├── ProductImages.js
│   ├── ProductReviews.js
│   ├── ProductVariants.js
│   └── RelatedProducts.js
├── pwa/                [Not listed - check if exists]
└── ui/
    ├── Button.js               ⚠️ (duplicate: also .jsx)
    ├── Button.jsx              ⚠️ (duplicate)
    ├── ErrorBoundary.js
    ├── Input.js
    ├── Loading.js
    ├── Modal.js
    ├── QuantitySelector.js
    └── WeightSelector.jsx
```

**Total Components: 40+ files**  
⚠️ **Note:** Duplicate files exist (.js and .jsx versions)

---

## 3️⃣ ALL PAGES IN SRC/PAGES/

```
src/pages/
├── AdminDashboardPage.js
├── AdminOrdersPage.js
├── AdminProductsPage.js
├── AdminUsersPage.js
├── CartPage.js
├── CheckoutPage.js
├── LoginPage.js
├── OrderConfirmationPage.js
├── ProductDetailPage.js
└── ProductsPage.js
```

**Total Pages: 10 pages**

---

## 4️⃣ WEIGHT SELECTION COMPONENTS - DETAILED ANALYSIS

### Weight Selector Implementation
**File:** [client/src/components/ui/WeightSelector.jsx](client/src/components/ui/WeightSelector.jsx)

```javascript
// Features:
- WEIGHT_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 2.5, 3] kg
- Dropdown selector with current weight display
- Dynamic price calculation based on selected weight
- No data-testid attributes
- Uses className selectors only

// Props:
- weight (default: 1)
- onWeightChange (callback)
- pricePerKg (for price display)
- discount (for calculation)
- className
```

### Product Card Weight Selection
**File:** [client/src/components/product/ProductCard.jsx](client/src/components/product/ProductCard.jsx)

```javascript
// Features:
- useState for selectedWeight (initial: 1)
- Collapsible weight selector on mobile
- WeightSelector component integration
- calculatePrice() function called on weight change
- Shows: weight, total price, discount
- Renders: Add to Cart button or Quantity controls
- No data-testid attributes
```

### Product Card (Legacy)
**File:** [client/src/components/product/ProductCard.js](client/src/components/product/ProductCard.js)

```javascript
// Features:
- Duplicate of ProductCard.jsx (different implementation)
- WEIGHT_OPTIONS = [0.5, 1, 1.5, 2] kg (fewer options)
- Inline select element for weight
- Link-based product navigation
- No data-testid attributes
```

---

## 5️⃣ CART PRICE CALCULATION LOGIC

### Store Implementation
**File:** [client/src/store/useCartStore.js](client/src/store/useCartStore.js)

```javascript
/**
 * PRICE CALCULATION FORMULA
 * 
 * subtotal = Σ(item.price * item.quantity) for all items
 * 
 * delivery_fee = subtotal >= 300 ? 0 : 30
 * 
 * estimated_total = subtotal + delivery_fee
 */

// Price Calculation:
const subtotal = items.reduce((sum, item) => {
  return sum + (item.price * item.quantity);
}, 0);

const deliveryFee = subtotal >= 300 ? 0 : 30;

return {
  item_count: items.length,
  subtotal: parseFloat(subtotal.toFixed(2)),
  delivery_fee: deliveryFee,
  estimated_total: parseFloat((subtotal + deliveryFee).toFixed(2)),
};

// FREE DELIVERY THRESHOLD: ₹300
```

### Weight System Utilities
**File:** [client/src/utils/weightSystem.js](client/src/utils/weightSystem.js)

```javascript
// calculatePrice(pricePerKg, weight, discount = 0)
// Returns: {
//   pricePerKg,
//   weight,
//   basePrice: pricePerKg * weight,
//   discount,
//   finalPrice: basePrice - discount,
//   discountPercentage
// }

// calculateDelivery(subtotal)
// Returns: {
//   isFreeDelivery: subtotal >= 300,
//   deliveryFee: subtotal >= 300 ? 0 : 50,  // ⚠️ NOTE: Uses ₹50, not ₹30!
//   subtotal,
//   total: subtotal + deliveryFee
// }

// FREE_DELIVERY_THRESHOLD = 300
```

### Cart Summary UI
**File:** [client/src/pages/CartPage.js](client/src/pages/CartPage.js)

```javascript
// Displays:
- subtotal (from store summary)
- delivery fee (from store summary)
- final total (subtotal + delivery_fee)

// Uses useCart hook to access cart state
// Uses .toLocaleString() for currency formatting
// No data-testid attributes
```

---

## 6️⃣ CRITICAL ISSUES IDENTIFIED

### 🔴 Issue #1: Zero Test IDs in Components
- **Status:** BLOCKING
- **Impact:** ALL E2E tests will fail immediately
- **Scope:** 40+ component files, 0 have data-testid attributes
- **Solution:** Add data-testid to all key DOM elements (see table in section 1)

### 🔴 Issue #2: Duplicate Component Files
- **Affected:**
  - `ProductCard.js` vs `ProductCard.jsx` (different implementations!)
  - `Button.js` vs `Button.jsx`
  - `CartDrawer.js` vs `CartDrawer.jsx`
- **Impact:** Unclear which version is being used
- **Solution:** Remove duplicates, consolidate to single version

### 🟡 Issue #3: Delivery Fee Mismatch
- **File:** `useCartStore.js` uses ₹30 as delivery fee
- **File:** `weightSystem.js` uses ₹50 as delivery fee
- **Impact:** Price calculations may be inconsistent
- **Solution:** Standardize on single delivery fee value

### 🟡 Issue #4: Weight Options Inconsistency
- **WeightSelector.jsx:** [0.25, 0.5, 1, 1.5, 2, 2.5, 3] kg
- **ProductCard.js:** [0.5, 1, 1.5, 2] kg
- **Impact:** Different weight options across components
- **Solution:** Use constant from `weightSystem.js` everywhere

---

## 7️⃣ TEST ID IMPLEMENTATION CHECKLIST

To make tests pass, add these data-testid attributes:

### ProductCard Components
- [ ] `data-testid="product-card"` → Wrapper div
- [ ] `data-testid="product-price"` → Price display element
- [ ] `data-testid="discount-badge"` → Discount badge (if discount > 0)
- [ ] `data-testid="discount-amount"` → Discount amount display
- [ ] `data-testid="original-price"` → Price before discount
- [ ] `data-testid="final-price"` → Price after discount

### Weight Selector
- [ ] `data-testid="weight-selector"` → Main selector container
- [ ] `data-testid="calculated-price"` → Price after weight selection

### Add to Cart
- [ ] `data-testid="add-to-cart-btn"` → Add to cart button

### Header/Navigation
- [ ] `data-testid="cart-icon"` → Cart button/icon in header
- [ ] `data-testid="cart-badge"` → Item count badge on cart icon

### Cart Drawer/Panel
- [ ] `data-testid="cart-drawer"` → Cart sidebar container
- [ ] `data-testid="delivery-status"` → Delivery fee status text
- [ ] `data-testid="subtotal"` → Subtotal display
- [ ] `data-testid="delivery-fee"` → Delivery fee display
- [ ] `data-testid="total"` → Final total display

---

## 📋 COMPONENT USAGE SUMMARY

### Weight Selection Used In:
1. **ProductCard.jsx** - Main product card component
2. **ProductCard.js** - Legacy/alternate implementation
3. **WeightSelector.jsx** - Dedicated weight selector UI
4. **ProductDetail.js** - Product detail page (likely)
5. **CartItem.js** - Cart item editing (likely)

### Price Calculation Used In:
1. **useCartStore.js** - Main cart state management
2. **weightSystem.js** - Utility functions
3. **CartPage.js** - Cart display page
4. **CheckoutForm.js** - Checkout calculations (likely)
5. **ProductCard.jsx** - Product selection
6. **WeightSelector.jsx** - Price preview

---

## 🎯 NEXT STEPS (PRIORITY ORDER)

1. **HIGH:** Add all 16 data-testid attributes to components (see checklist above)
2. **HIGH:** Resolve delivery fee inconsistency (₹30 vs ₹50)
3. **HIGH:** Choose and consolidate duplicate component files (.js vs .jsx)
4. **MEDIUM:** Standardize WEIGHT_OPTIONS across all files
5. **MEDIUM:** Add descriptive console logs in price calculation for debugging
6. **LOW:** Review all imports/exports for consistency

---

## 📁 RELATED FILES FOR REFERENCE

- Test specification: `client/e2e/checkout-flow.spec.ts`
- Pricing logic: `client/src/utils/weightSystem.js`
- Cart state: `client/src/store/useCartStore.js`
- Cart display: `client/src/pages/CartPage.js`
- Component files: `client/src/components/*/`

