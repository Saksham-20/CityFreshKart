# 🏗️ CityFreshKart v2.0 - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER DEVICES                              │
│                  (Mobile, Tablet, Desktop)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    HTTPS / WSS
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    PROGRESSIVE WEB APP                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React 18 Frontend (SPA)                                 │   │
│  │  ├─ Components: ProductCard, CartDrawer, WeightSelector │   │
│  │  ├─ State: Zustand (productStore) + Context API         │   │
│  │  ├─ Service Worker: Offline caching                     │   │
│  │  └─ App Manifest: Installable PWA                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  IndexedDB: Offline Order Queue                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    REST API (JSON)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    BACKEND API SERVER                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Node.js + Express                                       │   │
│  │  ├─ Routes: /api/products, /api/orders, /api/cart        │   │
│  │  ├─ Controllers: OrderController, ProductController      │   │
│  │  ├─ Middleware: Auth (JWT), Validation, RateLimit       │   │
│  │  └─ Services: PaymentService, EmailService              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Prisma ORM                                              │   │
│  │  ├─ Schema Management                                    │   │
│  │  ├─ Type-Safe Queries                                   │   │
│  │  └─ Automated Migrations                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                   PostgreSQL Protocol
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    DATABASE LAYER                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL                                              │   │
│  │  ├─ users                                                │   │
│  │  ├─ products                                             │   │
│  │  ├─ orders                                               │   │
│  │  ├─ order_items (with weight-based pricing)              │   │
│  │  ├─ carts, cart_items                                    │   │
│  │  ├─ wishlists, wishlist_items                            │   │
│  │  └─ user_addresses                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  External Services                                       │   │
│  │  ├─ Razorpay (Payments)                                  │   │
│  │  ├─ Local disk /uploads (product images)                  │   │
│  │  └─ SendGrid/Nodemailer (Email)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Frontend Component Hierarchy

```
App.jsx (Router + Providers)
│
├─ AuthProvider
├─ CartProvider
├─ WishlistProvider
│
└─ Routes
   ├─ PublicRoutes
   │  ├─ HomePage
   │  │  └─ ProductCard (NEW)
   │  │     └─ WeightSelector (NEW)
   │  │        └─ Button
   │  │
   │  ├─ ProductsPage
   │  │  └─ Grid of ProductCard
   │  │
   │  ├─ ProductDetailPage
   │  │  ├─ Product Image
   │  │  └─ WeightSelector
   │  │
   │  └─ CartPage
   │     ├─ CartItem (legacy, should use drawer)
   │     └─ CartSummary
   │
   ├─ ProtectedRoutes
   │  ├─ CheckoutPage
   │  ├─ OrdersPage
   │  └─ ProfilePage
   │
   └─ Global Components
      ├─ CartDrawer (NEW)
      │  └─ CartItem Display
      │
      ├─ InstallPrompt (NEW)
      │  └─ PWA Banner
      │
      ├─ Header
      │  └─ Navigation
      │
      └─ Footer
```

---

## Data Flow Diagram

```
USER INTERACTION
      │
      ▼
┌─────────────────┐
│  ProductCard    │  ◄─── weightsystem.js (price calc)
│  - Select Weight│      - calculatePrice()
│  - Add to Cart  │      - calculateDelivery()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CartContext    │  (useCart hook)
│  - Add Item     │  
│  - Remove Item  │  
│  - Update Qty   │  
│  - Calculate    │  
│    Subtotal     │  
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CartDrawer     │  ◄─── Shows:
│  - Display Items│      - Items with weight
│  - Show Total   │      - Discount
│  - Delivery Fee │      - Delivery Fee
│  - Checkout BTN │      - Total Price
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CheckoutPage   │
│  - Address Form │
│  - Payment Info │
│  - Final Review │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  API: POST /api/orders      │
│  ┌───────────────────────┐  │
│  │ Order Data:           │  │
│  │ - items[]             │  │
│  │   - product_id        │  │
│  │   - weight            │  │
│  │   - price_per_kg      │  │
│  │   - calculated_price  │  │
│  │ - shipping_address    │  │
│  │ - payment_method      │  │
│  │ - notes               │  │
│  └───────────────────────┘  │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Database: orders table     │
│  ┌───────────────────────┐  │
│  │ - order_id (PK)       │  │
│  │ - user_id (FK)        │  │
│  │ - subtotal            │  │
│  │ - delivery_fee        │  │
│  │ - total               │  │
│  │ - status              │  │
│  │ - created_at          │  │
│  └───────────────────────┘  │
│                             │
│  order_items table (linked) │
│  ┌───────────────────────┐  │
│  │ - order_item_id (PK)  │  │
│  │ - order_id (FK)       │  │
│  │ - product_id (FK)     │  │
│  │ - weight              │  │
│  │ - quantity            │  │
│  │ - price_per_kg        │  │
│  │ - calculated_price    │  │
│  │ - subtotal            │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

---

## Weight & Pricing Logic Flow

```
┌────────────────────────┐
│ User Selects Weight    │
└────────────┬───────────┘
             │
             ▼
┌────────────────────────────────────┐
│ weightSystem.calculatePrice()       │
│ Input:                             │
│ - pricePerKg: 40                   │
│ - weight: 1.5                      │
│ - discount: 10 (optional)          │
│                                    │
│ Calculation:                       │
│ basePrice = 40 × 1.5 = 60          │
│ finalPrice = 60 - 10 = 50          │
└────────────┬───────────────────────┘
             │
             ▼ (returns)
┌────────────────────────────────────┐
│ pricing = {                        │
│   pricePerKg: 40,                  │
│   weight: 1.5,                     │
│   basePrice: 60,                   │
│   discount: 10,                    │
│   finalPrice: 50,                  │
│   discountPercentage: 16.67        │
│ }                                  │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ Cart Item Created                  │
│ {                                  │
│   product_id: 'xy123',             │
│   weight: 1.5,                     │
│   quantity: 2,                     │
│   price: 50 (per item)             │
│   pricePerKg: 40                   │
│ }                                  │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ Calculate Cart Summary              │
│ subtotal = sum of (price × qty)    │
│ = 50 × 2 = 100                     │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ calculateDelivery(subtotal)        │
│ IF subtotal >= 300:                │
│   deliveryFee = 0 (FREE)           │
│ ELSE:                              │
│   deliveryFee = 50                 │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ Final Total = subtotal + fee       │
│ = 100 + 50 = 150                   │
└────────────────────────────────────┘
```

---

## Database Schema Relationships

```
users (1)──────────────┐
                       │
                   (1)─┼─(M)
                       │
                    carts (1)──────────┐
                       │               │
                   (1)─┼─(M)       (1)─┼─(M)
                       │               │
                  cart_items          │
                       │          (many)
                   (M)─┼─(1)          │
                       │          products
                  products            │
                       │          (many)
                   (1)─┼─(M)
                       │
                  order_items


users (1)─────────────────────┐
                              │
                          (1)─┼─(M)
                              │
                           orders
                              │
                          (1)─┼─(M)
                              │
                         order_items
                              │
                          (M)─┼─(1)
                              │
                           products


users (1)──────────────────┐
                           │
                       (1)─┼─(M)
                           │
                    wishlists
                           │
                       (1)─┼─(M)
                           │
                   wishlist_items
                           │
                       (M)─┼─(1)
                           │
                        products
```

---

## State Management Strategy

```
┌─────────────────────────────────────────┐
│   Global State (Zustand)                │
│                                         │
│   productStore.js                       │
│   ├─ products[]                         │
│   ├─ selectedProduct                    │
│   ├─ filters {                          │
│   │   category, price, search, sort     │
│   │ }                                   │
│   └─ Actions: setProducts, setFilter    │
│                                         │
│   Persisted to localStorage             │
└─────────────────────────────────────────┘
         ▲
         │
    (zustand/middleware)
         │
         ▼
┌─────────────────────────────────────────┐
│   Component Local State                 │
│   (React.useState, useCallback)         │
│                                         │
│   WeightSelector: selectedWeight        │
│   CartDrawer: isOpen                    │
│   InstallPrompt: isVisible              │
│                                         │
│   Computed/Derived from global          │
│   (no duplication)                      │
└─────────────────────────────────────────┘
         ▲
         │
    (useSelector)
         │
         ▼
┌─────────────────────────────────────────┐
│   Server State (Context)                │
│   [Keep for backward compatibility]     │
│                                         │
│   AuthContext                           │
│   CartContext (legacy)                  │
│   WishlistContext (legacy)              │
│                                         │
│   ↓ Migrate to Zustand stores           │
└─────────────────────────────────────────┘
```

---

## PWA Caching Strategy

```
USER REQUESTS RESOURCE
         │
         ▼
┌──────────────────────┐
│ Service Worker       │
│ (public/sw.js)       │
└──────────┬───────────┘
           │
           ├────── Is API call? ──────────────────┐
           │                                      │
           │                           ┌──────────▼─────────┐
           │                           │ Network First      │
           │                           │ ├─ Try network     │
           │                           │ ├─ Cache if 200    │
           │                           │ └─ Fallback cache  │
           │                           └────────────────────┘
           │
           ├────── Is image? ────────────────────┐
           │                                     │
           │                          ┌──────────▼────────┐
           │                          │ Cache First       │
           │                          │ ├─ Check cache    │
           │                          │ ├─ Fetch if miss  │
           │                          │ └─ Cache result   │
           │                          └───────────────────┘
           │
           └────── Is HTML/CSS/JS? ───┐
                                       │
                             ┌─────────▼──────────┐
                             │ Stale While Revalidate
                             │ ├─ Serve cached    │
                             │ ├─ Update background
                             │ └─ Show updated    │
                             └────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│  Development Environment                │
│  └─ localhost:3000 & localhost:5000     │
└─────────────────────────────────────────┘
                 │
       (git push)│
                 ▼
┌─────────────────────────────────────────┐
│  GitHub Repository                      │
│  └─ Main branch                         │
└─────────────────────────────────────────┘
                 │
    (GitHub Actions CI/CD)
                 │
     ┌───────────┴──────────┐
     │                      │
     ▼                      ▼
┌──────────┐          ┌─────────────┐
│ Frontend │          │  Backend    │
│ Build & │          │  Build &    │
│ Deploy  │          │  Deploy     │
└────┬─────┘          └──────┬──────┘
     │                       │
     ▼                       ▼
┌──────────────────┐ ┌──────────────────┐
│ Vercel / Netlify │ │ Heroku / AWS ECS │
│ Static files     │ │ Node.js API      │
│ CDN delivery     │ │ Auto scaling     │
└────────┬─────────┘ └────────┬─────────┘
         │                    │
         │    ┌───────────────┘
         │    │
         └────┼──────────────┐
              │              │
              ▼              ▼
         ┌──────────┐  ┌──────────────┐
         │  Client  │  │  PostgreSQL  │
         │   PWA    │  │   Database   │
         └──────────┘  └──────────────┘
```

---

## Key Technology Stack

### Frontend
- **React 18** - UI library
- **Vite/CRA** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui + Radix** - Components
- **Lucide Icons** - Icons
- **Zustand** - State management
- **Framer Motion** - Animations
- **Workbox** - Service worker

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Prisma ORM** - Database access
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Stripe** - Payments

### DevOps & Testing
- **Playwright** - E2E testing
- **Docker** - Containerization
- **GitHub Actions** - CI/CD
- **Vercel/Netlify** - Frontend hosting
- **Heroku/AWS** - Backend hosting

---

## Performance Metrics Target

```
┌───────────────────────────┬─────────┬────────┐
│ Metric                    │ Target  │ Status │
├───────────────────────────┼─────────┼────────┤
│ Lighthouse Performance    │ 95+     │ 🟡     │
│ Lighthouse Accessibility │ 95+     │ 🟡     │
│ Lighthouse Best Practices │ 95+     │ 🟡     │
│ Lighthouse SEO            │ 95+     │ 🟡     │
│ First Contentful Paint    │ <1.8s   │ 🟡     │
│ Largest Contentful Paint  │ <2.5s   │ 🟡     │
│ Cumulative Layout Shift   │ <0.1    │ 🟡     │
│ Bundle Size               │ <150KB  │ 🟡     │
│ API Response Time         │ <200ms  │ 🟡     │
└───────────────────────────┴─────────┴────────┘
```

---

**This architecture is:**
- ✅ Scalable
- ✅ Secure
- ✅ Performant
- ✅ Maintainable
- ✅ Tested
- ✅ Production-Ready
