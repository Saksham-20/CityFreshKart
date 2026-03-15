# 🥬 CityFreshKart v2.0 - Upgraded Guide

## 🚀 What's New in This Upgrade

### Frontend Enhancements
- ✅ **Modern UI Components** - shadcn/ui + Radix UI
- ✅ **Lucide Icons** - Replaced React Icons for consistency
- ✅ **Zustand State Management** - Lightweight, performant state
- ✅ **React Hook Form** - Better form handling
- ✅ **Weight-Based Pricing** - Dynamic price calculation with weight selector
- ✅ **Cart Drawer** - Side drawer instead of page redirect for faster UX
- ✅ **PWA Features** - Full offline support, installable on mobile
- ✅ **Workbox Caching** - Smart caching strategies
- ✅ **Framer Motion** - Smooth animations

### Backend Improvements
- ✅ **Prisma ORM** - Type-safe database access
- ✅ **Cleaner API Structure** - Better organized routes
- ✅ **Production Ready** - Enhanced error handling
- ✅ **Database Migrations** - Prisma migrations for schema management

### Quality Assurance
- ✅ **Playwright E2E Tests** - Automated UI testing
- ✅ **Mobile Testing** - Responsive design verification
- ✅ **Performance Optimization** - Image lazy loading, code splitting

---

## 🛠 Installation & Setup

### Prerequisites
- Node.js v16+ 
- PostgreSQL v12+
- npm or yarn

### 1. Install Dependencies

```bash
# Root dependencies
npm install

# Frontend dependencies
cd client && npm install
cd ..

# Backend dependencies (if not already in root)
npm install
```

### 2. Database Setup with Prisma

```bash
# Install Prisma (if not already installed)
npm install @prisma/client prisma -D

# Create .env file from template
cp env.example .env

# Update DATABASE_URL in .env with your PostgreSQL connection

# Run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Optional: Seed database
npx prisma db seed
```

### 3. Frontend Configuration

**Update `/client/.env.local`:**
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

### 4. Start Development

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend  
cd client && npm start
```

Visit: **http://localhost:3000**

---

## 📱 Key Features Explained

### Weight-Based Pricing System

**Price Calculation:**
```javascript
// User selects weight: 1.5 kg
// Price per kg: ₹40
// Calculated Price: 40 × 1.5 = ₹60

// If discount ₹10:
// Final Price: ₹60 - ₹10 = ₹50
```

**Weight Options:**
- 0.25 kg (250g)
- 0.5 kg (500g)
- 1 kg
- 1.5 kg
- 2 kg
- 2.5 kg
- 3 kg

### Delivery Fee Logic

```javascript
- Subtotal ≥ ₹300 → FREE DELIVERY
- Subtotal < ₹300 → ₹50 DELIVERY FEE
```

### Cart Drawer (Not Page)

Instead of redirecting to `/cart`, the cart now opens as a slide-out drawer:
- **Mobile**: Full width drawer
- **Desktop**: 384px side panel
- **Animation**: Smooth spring transition
- **Accessibility**: Press ESC to close

### PWA (Progressive Web App)

**Features Enabled:**
- ✅ Service Worker for offline support
- ✅ App installation on Android/iOS
- ✅ Smart caching (Images, API, pages)
- ✅ Offline order queueing
- ✅ Push notifications ready
- ✅ Installable from browser

**Install on Device:**
1. Open in mobile browser
2. Tap "Install" banner (or menu → "Install app")
3. App works offline with cached data

---

## 🧪 Testing

### Run Playwright E2E Tests

```bash
# Install Playwright (first time)
npx playwright install

# Run all tests
npm run test:e2e

# Run specific test file
npx playwright test e2e/checkout-flow.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run on specific device
npx playwright test --project="Mobile Chrome"

# Debug mode
npx playwright test --debug
```

**Tests Include:**
- ✅ Product selection with weight
- ✅ Price calculation
- ✅ Add to cart
- ✅ Free delivery threshold
- ✅ Cart total calculation
- ✅ Discount application
- ✅ Mobile responsiveness
- ✅ PWA installation

---

## 📊 Project Structure

```
client/
├── public/
│   ├── index.html
│   ├── manifest.json (PWA manifest)
│   ├── sw.js (Service Worker)
│   └── icons/ (PWA icons)
├── src/
│   ├── components/
│   │   ├── product/ProductCard.jsx (NEW - with weight selector)
│   │   ├── cart/CartDrawer.jsx (NEW - side drawer)
│   │   ├── pwa/InstallPrompt.jsx (NEW)
│   │   ├── ui/ (shadcn-style components)
│   │   │   ├── Button.jsx
│   │   │   ├── WeightSelector.jsx
│   │   │   └── ...
│   ├── store/
│   │   └── productStore.js (Zustand store)
│   ├── utils/
│   │   ├── weightSystem.js (Weight & pricing logic)
│   │   ├── cn.js (Tailwind merge utility)
│   │   ├── pwa.js (PWA functions)
│   │   └── ...
│   ├── App.js (Updated with PWA)
│   └── index.js (PWA initialization)
├── e2e/
│   └── checkout-flow.spec.ts (Playwright tests)
├── playwright.config.ts (Test config)
└── package.json (Updated dependencies)

server/
├── prisma/
│   └── schema.prisma (Data models)
├── database/
│   └── schema.sql (Legacy - now use Prisma)
├── routes/
├── controllers/
├── models/ → (use Prisma client instead)
└── index.js
```

---

## 🎨 New Components

### ProductCard
```jsx
<ProductCard
  product={product}
  onAddToCart={handleAdd}
  onToggleWishlist={handleWishlist}
  isInCart={inCart}
  isInWishlist={inWishlist}
  cartQuantity={quantity}
  onUpdateQuantity={updateQty}
/>
```

### WeightSelector
```jsx
<WeightSelector
  weight={selectedWeight}
  onWeightChange={setWeight}
  pricePerKg={40}
  discount={10}
/>
```

### CartDrawer
```jsx
<CartDrawer
  isOpen={isOpen}
  onClose={closeCart}
  items={cartItems}
  onUpdateQuantity={update}
  onRemoveItem={remove}
  onCheckout={proceed}
  subtotal={total}
/>
```

---

## 🔧 Prisma Commands

```bash
# Create new migration
npx prisma migrate dev --name add_new_field

# View database
npx prisma studio

# Reset database (⚠️ careful!)
npx prisma migrate reset

# Generate client after schema changes
npx prisma generate
```

---

## 🚀 Production Deployment

### Build Frontend
```bash
cd client
npm run build
# Output: client/build/
```

### Backend Production
```bash
# Set NODE_ENV
export NODE_ENV=production

# Run migrations
npx prisma migrate deploy

# Start server
npm start
```

### PWA Note
- Service Worker only works on HTTPS (except localhost)
- Update manifest.json with correct app details
- Add proper icons (192x192, 512x512)

---

## 📈 Performance Targets

**Lighthouse Scores:**
- Performance: 95+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+

**Optimizations Applied:**
- Image lazy loading
- Code splitting with React.lazy
- Service Worker caching
- Gzip compression
- Tree shaking

---

## 🔐 Security

**Implemented:**
- ✅ Helmet.js headers
- ✅ CORS properly configured
- ✅ Rate limiting (100 req/15min)
- ✅ JWT authentication
- ✅ Password hashing (bcryptjs)
- ✅ Input validation
- ✅ SQL injection prevention (Prisma)

---

## 🐛 Troubleshooting

### Service Worker not registering?
- Check if HTTPS or localhost
- Clear browser cache (DevTools → Application)
- Check `/sw.js` is accessible

### Prisma errors?
```bash
# Regenerate client
npx prisma generate

# Update Prisma
npm install @prisma/client@latest
```

### Tests failing?
```bash
# Ensure server is running on port 5000
# Ensure frontend runs on port 3000
# Update BASE_URL in test file if needed
```

---

## 📋 Checklist Before Production

- [ ] Update `.env` with production values
- [ ] Run all Playwright tests
- [ ] Test on real mobile devices
- [ ] Check Lighthouse scores
- [ ] Enable HTTPS
- [ ] Update manifest.json with real icons
- [ ] Configure CDN for images
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Monitor error logs

---

## 📞 Support & Documentation

**Key Files:**
- Component usage: `/client/src/components/**/*.jsx`
- Utils: `/client/src/utils/`
- Backend schema: `/server/prisma/schema.prisma`
- Tests: `/client/e2e/`

**External Docs:**
- [Prisma Docs](https://www.prisma.io/docs/)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Playwright Docs](https://playwright.dev)
- [Lucide Icons](https://lucide.dev)

---

## 🎯 Next Steps

1. **Install dependencies** with `npm install`
2. **Setup database** with Prisma migrations
3. **Configure .env** with your values
4. **Run dev server** with `npm run dev`
5. **Test locally** and run E2E tests
6. **Deploy** with production build

---

**Happy coding! 🚀**

Made with ❤️ for City Fresh Kart
