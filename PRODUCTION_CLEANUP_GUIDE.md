# CityFreshKart Production Cleanup & Optimization Guide

## ✅ COMPLETED WORK

### Database & Backend Cleanup
- [x] Cleaned Prisma schema - removed unnecessary tables (Wishlist, ProductReview, ProductVariant, ShippingAddress, ActivityLog)
- [x] Removed unnecessary User fields (email, password, date_of_birth, isVerified)
- [x] Simplified Product model (removed compare_price, cost_price, rating, reviews, variants)
- [x] Cleaned UserAddress (removed company, address_line_2, country, address_type)
- [x] Simplified Order & OrderItem models
- [x] Removed wishlist.js route file from index.js registration

### Frontend Cleanup
- [x] Removed Wishlist from App.js routing
- [x] Removed unnecessary pages from lazy loading (AboutPage, CollectionPage, VerifyEmailPage, RegisterPage, AdminAnalyticsPage, AdminSettingsPage)
- [x] Simplified Header component (removed wishlist icon/references)
- [x] Removed useWishlist hook imports

### APIs & Endpoints
- [x] Implemented optimized SEARCH endpoint at `/api/products/search?q=keyword`
- [x] Search supports case-insensitive matching on product name and category
- [x] Uses database indexes for fast performance

---

## 🚨 CRITICAL REMAINING TASKS

### 1. PHONE-BASED OTP AUTHENTICATION (HIGH PRIORITY)

**Current State:** Still using email/password  
**Required:** Phone-only, OTP-based login  

**Implementation Steps:**

```javascript
// server/routes/auth.js - New OTP endpoints needed

// POST /api/auth/request-otp
// Body: { phone: "+91XXXXXXXXXX" }
// Returns: { success: true, sessionId: "xxx" }
// Backend: Generate 6-digit OTP, store in Redis with expiry (5 min)

// POST /api/auth/verify-otp  
// Body: { sessionId: "xxx", otp: "123456" }
// Returns: { success: true, token: "jwt", user: {...} }

// Remove:
// - POST /api/auth/register
// - POST /api/auth/login with password
// - Email verification routes
```

**Frontend Update:** LoginPage.js
```javascript
// New logic:
// 1. Ask for phone number
// 2. Show OTP input after user submits phone
// 3. On OTP verify, auto-login and navigate to home
// 4. Remove email, password fields entirely
```

---

### 2. FIX CART DYNAMIC PRICING (HIGH PRIORITY)

**Problem:** Price calculation must work with weight-based pricing

**Required Logic:**
```
final_price = (price_per_kg * selected_weight * quantity) - discount
delivery_fee = total >= 300 ? 0 : 30
```

**Files to Update:**
- `useCartStore.js` - Fix calculateSummary function
- `ProductCard.js` - Ensure weight selector updates price dynamically
- `CartDrawer.js` - Display correct total with delivery fee

**Code Fix:**
```javascript
// In useCartStore.js - calculateSummary function
const calculateSummary = (items) => {
  const subtotal = items.reduce((sum, item) => {
    // price_per_kg * weight * quantity
    const itemPrice = (item.price_per_kg || 0) * (item.weight || 1) * (item.quantity || 1);
    // Apply discount if exists
    const discountAmount = itemPrice * ((item.discount || 0) / 100);
    return sum + (itemPrice - discountAmount);
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const deliveryFee = subtotal >= 300 ? 0 : 30;
  
  return {
    item_count: itemCount,
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: 0, // Applied per item
    delivery_fee: deliveryFee,
    estimated_total: parseFloat((subtotal + deliveryFee).toFixed(2)),
  };
};
```

---

### 3. VERIFY RAZORPAY INTEGRATION (HIGH PRIORITY)

**Check:** 
- Is Razorpay configured? (environment variables)
- Is payment flow working end-to-end?
- Remove any Stripe references

**Files:**
- `server/routes/razorpay.js` - Ensure create-order and verify-payment work
- `client/pages/CheckoutPage.js` - Integrate Razorpay SDK properly

**Test Flow:**
1. Login → Add to cart → Checkout 
2. Fill address → Click "Pay with Razorpay"
3. Test payment success/failure handling

---

### 4. ADMIN PANEL FOUNDATION (MEDIUM PRIORITY)

**Required Routes:**
- `GET /api/admin/dashboard` - Revenue, order count, top products
- `GET /api/admin/products` - List products
- `POST /api/admin/products` - Add product
- `PUT /api/admin/products/:id` - Edit product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/orders` - List all orders
- `PUT /api/admin/orders/:id/status` - Update order status
- `GET /api/admin/users` - List users

**Admin Dashboard Features (Minimal):**
1. Quick stats (Today's orders, Revenue, Pending orders)
2. Product management (CRUD)
3. Order management + status updates
4. User list view

---

### 5. REMOVE UNUSED FRONTEND FILES & COMPONENTS

**Delete These Pages:**
- `client/src/pages/WishlistPage.js`
- `client/src/pages/AboutPage.js`
- `client/src/pages/CollectionPage.js`
- `client/src/pages/VerifyEmailPage.js`
- `client/src/pages/PendingEmailVerificationPage.js`
- `client/src/pages/RegisterPage.js`
- `client/src/pages/AdminSettingsPage.js`
- `client/src/pages/AdminAnalyticsPage.js`

**Remove Stores:**
- `client/src/store/useWishlistStore.js`

**Remove Hooks:**
- `client/src/hooks/useWishlist.js`

---

### 6. OPTIMIZE PRODUCT CARD & PRICING DISPLAY

**ProductCard.js Requirements:**
```javascript
// Must display:
// 1. Product image
// 2. Product name
// 3. Price per kg
// 4. Weight selector (0.5kg, 1kg, 1.5kg, 2kg)
// 5. Dynamic price calculation as weight changes
// 6. Add to cart button
// 7. Show in-stock status

// Example: If price_per_kg = ₹50
// - 0.5kg → ₹25
// - 1kg → ₹50
// - 2kg → ₹100
```

---

## 📊 DATABASE MIGRATION CHECKLIST

When ready to deploy:
```sql
-- 1. Backup existing database
-- 2. Run migrations to remove:
--    - product_reviews table
--    - product_variants table
--    - wishlist table / wishlist_items table
--    - Unused fields from products, users, orders, addresses

-- 3. Create indexes for search performance:
CREATE INDEX idx_products_name_lower ON products (LOWER(name));
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_active ON products (is_active);
```

---

## 🧪 TESTING CHECKLIST

Before production:

- [ ] **Auth Flow:** Phone → OTP → Login → Session persists
- [ ] **Search:** Search by product name, returns results, "no results found" message
- [ ] **Cart:** 
  - Add product with different weights
  - Update weight dynamically, price updates instantly
  - Remove item
  - Cart count updates correctly
  - Subtotal + delivery fee calculate correctly
- [ ] **Checkout:** 
  - Fill address form with all required fields
  - Submit order
  - Razorpay payment modal appears
- [ ] **Payment:** 
  - Complete payment
  - Order confirmation page appears
  - Order saved to database
- [ ] **Admin:** 
  - Login as admin
  - Add/edit/delete product
  - View orders, update status
  - See dashboard stats
- [ ] **PWA:** 
  - Service worker registers
  - Install prompt appears
  - Works offline (cached assets)

---

## 🔐 SECURITY CHECKLIST

- [ ] Input validation on all forms (backend)
- [ ] JWT token verification on protected routes
- [ ] Admin routes require is_admin = true
- [ ] Rate limiting on auth endpoints (prevent brute force)
- [ ] SQL injection prevention (use parameterized queries)
- [ ] CORS properly configured
- [ ] Sensitive data (JWT) in httpOnly cookies

---

## ⚡ PERFORMANCE OPTIMIZATION

1. **Search:** Use database indexes (done in Prisma schema)
2. **Images:** Implement lazy loading on product grid
3. **Bundle:** Remove unused bootstrap/UI libraries
4. **API:** Cache category list (static)
5. **Frontend:** Debounce search input (already in Header)

---

## 📝 FINAL CLEANUP TASKS

1. Add JSDoc comments to critical functions
2. Remove console.log statements
3. Remove dead/unused code files
4. Test on mobile (primary device)
5. Verify PWA install prompt works
6. Test with slow network (3G simulation)

---

## DEPLOYMENT COMMANDS

```bash
# Backend setup
cd server
npm install
# Run DB migrations (Prisma)
npx prisma migrate dev --name initial
npm start

# Frontend build
cd client
npm install
npm run build

# Test PWA
npm install -g serve
serve -s build
```

---

**STATUS:** Core cleanup complete. Ready for feature implementation.  
**NEXT STEPS:** Implement OTP auth → Fix pricing logic → Admin panel → Testing
