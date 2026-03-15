# 📚 Component & Architecture Guide

## Quick Component Overview

### Product Card - ProductCard.jsx

**Location:** `client/src/components/product/ProductCard.jsx`

**Features:**
- Display product with image, name, price
- Weight selector with dynamic pricing
- Add to cart / quantity controls
- Wishlist toggle
- Discount badge
- Stock indicator

**Usage:**
```jsx
import ProductCard from '@/components/product/ProductCard';

<ProductCard
  product={{
    id: '1',
    name: 'Fresh Tomatoes',
    category_name: 'Vegetables',
    price_per_kg: 40,
    discount: 5,
    stock: 100,
    image: 'https://...',
    rating: 4.5,
    reviews: 234
  }}
  onAddToCart={handleAdd}
  onToggleWishlist={handleWishlist}
  isInCart={false}
  isInWishlist={false}
  cartQuantity={0}
  onUpdateQuantity={handleUpdate}
/>
```

**Props:**
```typescript
interface ProductCardProps {
  product: Product;
  onAddToCart: (item: CartItem) => void;
  onToggleWishlist: (productId: string) => void;
  isInCart?: boolean;
  isInWishlist?: boolean;
  cartQuantity?: number;
  onUpdateQuantity?: (productId: string, quantity: number) => void;
}
```

---

### Weight Selector - WeightSelector.jsx

**Location:** `client/src/components/ui/WeightSelector.jsx`

**Features:**
- Dropdown/combobox for weight selection
- Automatically calculates price
- Shows discount if applicable
- Displays total price
- Options: 0.25kg, 0.5kg, 1kg, 1.5kg, 2kg, 2.5kg, 3kg

**Usage:**
```jsx
import WeightSelector from '@/components/ui/WeightSelector';

<WeightSelector
  weight={selectedWeight} // 0-3kg
  onWeightChange={(w) => setSelectedWeight(w)}
  pricePerKg={40}
  discount={5}
/>
```

---

### Cart Drawer - CartDrawer.jsx

**Location:** `client/src/components/cart/CartDrawer.jsx`

**Features:**
- Slide-in from right side
- Shows all cart items with images
- Live price calculation
- Free delivery indicator (≥₹300)
- Checkout button
- Remove item buttons
- Closes on ESC key

**Usage:**
```jsx
import CartDrawer from '@/components/cart/CartDrawer';
import { useCart } from '@/context/CartContext';

const { items, updateItemQuantity, removeFromCart, summary } = useCart();

<CartDrawer
  isOpen={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  items={items}
  onUpdateQuantity={updateItemQuantity}
  onRemoveItem={removeFromCart}
  onCheckout={handleCheckout}
  subtotal={summary?.subtotal || 0}
/>
```

---

### Button (shadcn-style) - Button.jsx

**Location:** `client/src/components/ui/Button.jsx`

**Variants:**
- `default` - Green button (primary action)
- `secondary` - Gray button (secondary action)
- `outline` - Bordered button
- `ghost` - Transparent with hover effect
- `danger` - Red button (destructive action)

**Sizes:**
- `sm` - Small (8px height)
- `md` - Medium (10px height)
- `lg` - Large (12px height)
- `icon` - Icon only

**Usage:**
```jsx
import Button from '@/components/ui/Button';

<Button variant="default" size="md">
  Add to Cart
</Button>

<Button variant="outline" size="sm">
  Cancel
</Button>

<Button variant="danger" size="lg">
  Delete
</Button>
```

---

### Install Prompt - InstallPrompt.jsx

**Location:** `client/src/components/pwa/InstallPrompt.jsx`

**Features:**
- Shows install banner (once per session)
- Triggers native install dialog
- Dismissible
- Auto-hides on install

**Already included in App.js**

---

## State Management with Zustand

### Product Store

**Location:** `client/src/store/productStore.js`

**Usage:**
```jsx
import { useProductStore } from '@/store/productStore';

function MyComponent() {
  const { 
    products, 
    selectedProduct, 
    filters,
    setProducts,
    selectProduct,
    setFilter,
    getSortedProducts
  } = useProductStore();

  return (
    <div>
      {getSortedProducts().map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

**Available Actions:**
```javascript
setProducts(products)           // Load all products
selectProduct(product)          // Set selected product
clearSelectedProduct()          // Deselect product
setFilter(key, value)          // Update filter
resetFilters()                 // Clear all filters
getFilteredProducts(state)     // Get filtered items
getSortedProducts(state)       // Get sorted items
```

---

## Utility Functions

### Weight System - weightSystem.js

**Location:** `client/src/utils/weightSystem.js`

**Export Constants:**
```javascript
WEIGHT_OPTIONS         // [0.25, 0.5, 1, 1.5, 2, 2.5, 3]
FREE_DELIVERY_THRESHOLD // 300 (₹)
```

**Functions:**

```javascript
// Calculate price with weight and discount
calculatePrice(pricePerKg, weight, discount = 0)
// Returns: { pricePerKg, weight, basePrice, discount, finalPrice, discountPercentage }

// Calculate delivery fee based on subtotal
calculateDelivery(subtotal)
// Returns: { isFreeDelivery, deliveryFee, subtotal, total }

// Format price for display
formatPrice(price)  // "₹1,200"

// Format weight for display
formatWeight(weight)  // "1.5kg" or "250g"
```

**Example:**
```javascript
import { 
  calculatePrice, 
  calculateDelivery, 
  formatPrice,
  formatWeight 
} from '@/utils/weightSystem';

// Customer selects 1.5kg at ₹40/kg with ₹10 discount
const pricing = calculatePrice(40, 1.5, 10);
console.log(pricing);
// { pricePerKg: 40, weight: 1.5, basePrice: 60, discount: 10, finalPrice: 50, ... }

// Cart subtotal is ₹250
const delivery = calculateDelivery(250);
console.log(delivery);
// { isFreeDelivery: false, deliveryFee: 50, subtotal: 250, total: 300 }

// Display formatted
console.log(formatPrice(50));    // "₹50"
console.log(formatWeight(1.5));  // "1.5kg"
```

---

### Class Name Utility - cn.js

**Location:** `client/src/utils/cn.js`

**Purpose:** Merge Tailwind classes and resolve conflicts

**Usage:**
```javascript
import { cn } from '@/utils/cn';

// Combine conditional classes
const buttonClass = cn(
  'px-4 py-2 rounded',
  isActive ? 'bg-green-500' : 'bg-gray-200',
  isDisabled && 'opacity-50 cursor-not-allowed'
);

// Resolve Tailwind conflicts
cn('px-4', 'px-8')  // Results in 'px-8' (not both)
```

---

### PWA Utilities - pwa.js

**Location:** `client/src/utils/pwa.js`

**Functions:**
```javascript
initPWA()                              // Initialize service worker
showInstallPrompt()                    // Show install banner
handleInstallClick()                   // Handle install button
isAppInstalled()                       // Check if installed
getPWACapabilities()                   // Get feature support
requestNotificationPermission()        // Ask for notifications
sendNotification(title, options)       // Send notification
isOnline()                             // Check internet connection
onOnlineStatusChange(callback)         // Listen to status changes
```

**Example:**
```javascript
import { 
  initPWA, 
  sendNotification, 
  isOnline,
  onOnlineStatusChange 
} from '@/utils/pwa';

// Initialize on app start
useEffect(() => {
  initPWA();
}, []);

// Send notification when order placed
const handleOrderSuccess = async () => {
  await sendNotification('Order Confirmed!', {
    body: 'Your order #123 has been confirmed',
    tag: 'order-123'
  });
};

// Handle offline
useEffect(() => {
  onOnlineStatusChange((online) => {
    if (!online) {
      console.log('You are offline');
    }
  });
}, []);
```

---

## Context API (Legacy, still used)

### CartContext

**Location:** `client/src/context/CartContext.js`

**Hook:**
```javascript
import { useCart } from '@/context/CartContext';

const { 
  items,
  isLoading,
  error,
  addToCart,
  removeFromCart,
  updateItemQuantity,
  clearCart,
  getCartItemCount,
  summary  // { item_count, subtotal, delivery_fee, total }
} = useCart();
```

### AuthContext

**Location:** `client/src/context/AuthContext.js`

**Hook:**
```javascript
import { useAuth } from '@/context/AuthContext';

const { 
  user,
  isAuthenticated,
  login,
  register,
  logout,
  loading
} = useAuth();
```

### WishlistContext

**Location:** `client/src/context/WishlistContext.js`

**Hook:**
```javascript
import { useWishlist } from '@/context/WishlistContext';

const { 
  items,
  addToWishlist,
  removeFromWishlist,
  isItemInWishlist,
  clearWishlist
} = useWishlist();
```

---

## File Structure Best Practices

```
src/
├── components/          # Reusable React components
│   ├── product/        # Product-related
│   ├── cart/           # Cart-related
│   ├── pwa/            # PWA features
│   ├── ui/             # Shared UI components (Button, Input, etc)
│   ├── layout/         # Layout components (Header, Footer)
│   ├── auth/           # Auth components
│   └── common/         # Utility components
├── context/            # React Context providers
├── hooks/              # Custom React hooks
├── store/              # Zustand stores
├── services/           # API calls (axios)
├── utils/              # Utility functions
├── pages/              # Page components (route-based)
├── data/               # Static data
├── App.js             # Main app component
└── index.js           # Entry point
```

---

## Common Patterns

### Adding a New Feature

1. **Create Component:** `components/feature/FeatureComponent.jsx`
2. **Create Utility:** `utils/featureUtils.js` (if needed)
3. **Use Context/Store:** Import from `context/` or `store/`
4. **Add API Call:** Create service in `services/`
5. **Test:** Add test in `e2e/`

### Adding a New Page

1. Create `pages/NewPage.jsx`
2. Add route in `App.js`
3. Use lazy loading: `const NewPage = lazy(() => import('./pages/NewPage'))`
4. Wrap with ProtectedRoute if needed

### Styling

**Use Tailwind CSS classes:**
```jsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
  Text
</div>
```

**Use cn() for conditional classes:**
```jsx
<div className={cn(
  'base-class',
  isActive && 'active-class',
  disabled && 'disabled-class'
)}>
  Content
</div>
```

---

## Performance Tips

1. **Lazy load components** with `React.lazy()`
2. **Use Suspense** for loading states
3. **Memoize expensive components** with `React.memo()`
4. **Avoid inline functions** in JSX
5. **Use `useCallback`** for event handlers
6. **Optimize images** with lazy loading
7. **Split code** with dynamic imports

---

## Debugging

### Zustand DevTools
```javascript
import { devtools } from 'zustand/middleware';

export const useStore = create(
  devtools((set) => ({
    // ... store definition
  }))
);
```

### React DevTools
- Download React DevTools browser extension
- Inspect components and props
- Track hooks changes

### Playwright Debugging
```bash
npx playwright test --debug
# Step through tests visually
```

---

**Happy coding! 🎉**
