# 🔥 CityFreshKart - Priority Implementation Guide

**Purpose:** Detailed task breakdown for fixing backend & frontend to match production standards  
**Audience:** Claude AI code assistant, developers  
**Last Updated:** March 16, 2026

---

## 📌 CRITICAL PATH (Do First - 2-3 days)

### TIER 1: Database & Core Backend Structure

#### Task 1.1: Extend Prisma Schema
**File:** `server/prisma/schema.prisma`  
**Priority:** CRITICAL (blocks everything else)  
**Time:** 4-6 hours

**Add these models:**

```prisma
// Inventory Management
model Inventory {
  id            String   @id @default(uuid())
  productId     String   @unique
  warehouseId   String?
  quantity      Int      @default(0)
  lowStockAlert Int      @default(5)
  lastUpdated   DateTime @default(now())
  updatedAt     DateTime @updatedAt

  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("inventories")
}

// Delivery Partner Management
model DeliveryPartner {
  id            String   @id @default(uuid())
  name          String
  phone         String   @unique
  email         String?  @unique
  vehicle       String   // 'bike', 'scooter', 'car'
  licensePlate  String?
  rating        Float    @default(5.0)
  totalDeliveries Int    @default(0)
  isActive      Boolean  @default(true)
  isVerified    Boolean  @default(false)
  verifiedAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  assignments   DeliveryAssignment[]

  @@map("delivery_partners")
}

// Delivery Time Slots
model DeliverySlot {
  id              String   @id @default(uuid())
  date            DateTime
  startTime       String   // "09:00"
  endTime         String   // "12:00"
  maxCapacity     Int      @default(50)
  currentOrders   Int      @default(0)
  isBookingOpen   Boolean  @default(true)
  createdAt       DateTime @default(now())

  orders          Order[]

  @@unique([date, startTime])
  @@index([date])
  @@map("delivery_slots")
}

// Delivery Assignments
model DeliveryAssignment {
  id                String   @id @default(uuid())
  orderId           String   @unique
  partnerId         String
  status            String   @default("pending") // pending, accepted, on-way, delivered, failed
  acceptedAt        DateTime?
  startedAt         DateTime?
  deliveredAt       DateTime?
  currentLatitude   Float?
  currentLongitude  Float?
  estimatedTime     Int?     // minutes
  actualTime        Int?     // minutes
  failureReason     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  order             Order              @relation(fields: [orderId], references: [id], onDelete: Cascade)
  partner           DeliveryPartner    @relation(fields: [partnerId], references: [id])
  trackingHistory   DeliveryTracking[]

  @@index([partnerId])
  @@index([status])
  @@map("delivery_assignments")
}

// Real-time Delivery Tracking
model DeliveryTracking {
  id            String   @id @default(uuid())
  assignmentId  String
  latitude      Float
  longitude     Float
  timestamp     DateTime @default(now())
  
  assignment    DeliveryAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)

  @@index([assignmentId, timestamp])
  @@map("delivery_tracking")
}

// Payment Transactions (for reconciliation)
model PaymentTransaction {
  id              String   @id @default(uuid())
  orderId         String   @unique
  amount          Float
  currency        String   @default("INR")
  method          String   // 'card', 'upi', 'wallet', 'netbanking'
  stripeId        String?  @unique
  status          String   @default("pending") // pending, success, failed, refunded
  errorMessage    String?
  retryCount      Int      @default(0)
  lastRetryAt     DateTime?
  processedAt     DateTime?
  webhookReceived Boolean  @default(false)
  response        String?  // JSON stringified
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([createdAt])
  @@map("payment_transactions")
}

// Return/Refund Requests
model ReturnRequest {
  id              String   @id @default(uuid())
  orderId         String
  orderItemId     String?
  reason          String   // 'damaged', 'wrong_item', 'quality_issue', 'not_as_described'
  description     String?
  status          String   @default("submitted") // submitted, approved, rejected, shipped_back, refunded
  refundAmount    Float
  approvedAt      DateTime?
  refundedAt      DateTime?
  trackingNumber  String?
  rejectionReason String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([createdAt])
  @@map("return_requests")
}

// Notification Preferences
model NotificationPreference {
  id            String   @id @default(uuid())
  userId        String   @unique
  emailNews     Boolean  @default(true)
  emailOrders   Boolean  @default(true)
  emailPromos   Boolean  @default(false)
  smsOrders     Boolean  @default(true)
  smsPromos     Boolean  @default(false)
  pushOrders    Boolean  @default(true)
  pushPromos    Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notification_preferences")
}

// Admin Dashboard Metrics (cached daily)
model DashboardMetric {
  id              String   @id @default(uuid())
  date            DateTime @unique
  totalOrders     Int      @default(0)
  totalRevenue    Float    @default(0)
  avgOrderValue   Float    @default(0)
  totalCustomers  Int      @default(0)
  newCustomers    Int      @default(0)
  activePartners  Int      @default(0)
  topProduct      String?  // product name
  topCategory     String?  // category name
  createdAt       DateTime @default(now())

  @@index([date])
  @@map("dashboard_metrics")
}

// Order Status Events (for timeline)
model OrderStatusEvent {
  id        String   @id @default(uuid())
  orderId   String
  status    String   // 'created', 'confirmed', 'assigned', 'picked', 'on_way', 'delivered'
  timestamp DateTime @default(now())
  metadata  String?  // JSON stringified (e.g., partner name, notes)

  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId, timestamp])
  @@map("order_status_events")
}

// Coupon/Discount Codes
model Coupon {
  id              String   @id @default(uuid())
  code            String   @unique
  description     String?
  discountType    String   // 'percentage', 'fixed'
  discountValue   Float
  minOrderAmount  Float    @default(0)
  maxUses         Int      @default(0)   // 0 = unlimited
  currentUses     Int      @default(0)
  expiresAt       DateTime?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([code])
  @@index([isActive])
  @@map("coupons")
}
```

**After adding schema:**
```bash
cd server
npx prisma migrate dev --name "add_inventory_delivery_payment_refund"
npx prisma generate
```

**Validation:**
- Run `npx prisma studio` to verify tables created
- Check database: `\dt` in psql

---

#### Task 1.2: Update Order Model with new relations
**File:** `server/prisma/schema.prisma`  
**Priority:** CRITICAL  
**Time:** 2-3 hours

**Update Order model:**
```prisma
model Order {
  id                  String   @id @default(uuid())
  userId              String
  orderNumber         String   @unique
  subtotal            Float
  deliveryFee         Float    @default(0)
  discount            Float    @default(0)
  couponCode          String?
  total               Float
  status              String   @default("pending")
  paymentStatus       String   @default("pending")
  paymentMethod       String?
  notes               String?
  deliverySlotId      String?
  estimatedDeliveryAt DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Relations
  user                User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  items               OrderItem[]
  assignment          DeliveryAssignment?
  paymentTx           PaymentTransaction?
  returnRequests      ReturnRequest[]
  statusEvents        OrderStatusEvent[]
  slot                DeliverySlot?       @relation(fields: [deliverySlotId], references: [id])

  @@index([userId])
  @@index([status])
  @@index([deliverySlotId])
  @@map("orders")
}
```

**Update User model:**
```prisma
model User {
  id                      String   @id @default(uuid())
  email                   String   @unique
  password                String
  firstName               String
  lastName                String
  phone                   String?
  isAdmin                 Boolean  @default(false)
  isVerified              Boolean  @default(false)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  // Relations
  addresses               UserAddress[]
  orders                  Order[]
  cart                    Cart?
  wishlist                Wishlist?
  notificationPreference  NotificationPreference?

  @@map("users")
}
```

---

### TIER 2: Authentication & Security

#### Task 2.1: Implement JWT Refresh Token System
**File:** `server/middleware/auth.js` (update)  
**Priority:** CRITICAL  
**Time:** 3-4 hours

**Implementation:**

```javascript
// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const tokenBlacklist = new Set(); // Use Redis in production

// Generate access token (15 min expiry)
const generateAccessToken = (userId, email, isAdmin) => {
  return jwt.sign(
    { userId, email, isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Generate refresh token (7 day expiry)
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};

// Verify access token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'NO_TOKEN', message: 'Access token required' }
    });
  }

  if (tokenBlacklist.has(token)) {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked' }
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: err.message }
      });
    }
    req.user = decoded;
    next();
  });
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  authenticateToken,
  verifyRefreshToken,
  revokeToken: (token) => tokenBlacklist.add(token),
};
```

#### Task 2.2: Add Refresh & Logout Endpoints
**File:** `server/routes/auth.js` (add routes)  
**Priority:** CRITICAL  
**Time:** 2-3 hours

```javascript
// Add to auth routes
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'Refresh token required' }
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    const newAccessToken = generateAccessToken(user.id, user.email, user.isAdmin);
    res.json({
      success: true,
      data: { accessToken: newAccessToken }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { code: 'REFRESH_FAILED', message: error.message }
    });
  }
});

router.post('/logout', authenticateToken, (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
      revokeToken(token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'LOGOUT_FAILED', message: error.message }
    });
  }
});
```

---

### TIER 3: API Standardization & Middleware

#### Task 3.1: Create Error Handler Middleware
**File:** `server/middleware/errorHandler.js` (new)  
**Priority:** HIGH  
**Time:** 2 hours

```javascript
// server/middleware/errorHandler.js
class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  console.error(`[ERROR] ${err.code || 'UNKNOWN'}:`, err.message);

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An error occurred',
      ...(isDevelopment && { stack: err.stack })
    },
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler
};
```

#### Task 3.2: Create Validation Middleware
**File:** `server/middleware/validation.js` (new)  
**Priority:** HIGH  
**Time:** 3 hours

```javascript
// server/middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        fields: errors.array().map(e => ({
          field: e.param,
          message: e.msg
        }))
      }
    });
  }
  next();
};

// Reusable validators
const validators = {
  email: body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Invalid email format'),

  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
    .withMessage('Password must contain uppercase, number, and special character'),

  phone: body('phone')
    .matches(/^\+91\d{10}$/)
    .withMessage('Invalid Indian phone number format (+91XXXXXXXXXX)'),

  postalCode: body('postalCode')
    .matches(/^\d{6}$/)
    .withMessage('Invalid postal code format'),

  quantity: body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  weight: body('weight')
    .isFloat({ min: 0.25, max: 50 })
    .withMessage('Weight must be between 250g and 50kg'),

  price: body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be non-negative')
};

module.exports = {
  validate,
  validators
};
```

#### Task 3.3: Update `server/index.js` to use standardized middleware
**Priority:** HIGH  
**Time:** 3 hours

```javascript
// Add to middleware stack in server/index.js

const { errorHandler, asyncHandler } = require('./middleware/errorHandler');
const { validate } = require('./middleware/validation');
const crypto = require('crypto');

// Request ID middleware (for tracking)
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// ... existing middleware ...

// Add error handler at the END
app.use(errorHandler);
```

---

## 🎯 NEXT PRIORITY TASKS (Days 3-5)

### TIER 4: Order Management System

#### Task 4.1: Create Order Status State Machine
**File:** `server/services/orderService.js` (new)  
**Priority:** HIGH  
**Time:** 6-8 hours

```javascript
// server/services/orderService.js

class OrderService {
  // Valid transitions
  static STATE_TRANSITIONS = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['assigned', 'cancelled'],
    'assigned': ['picked', 'cancelled'],
    'picked': ['on-way', 'cancelled'],
    'on-way': ['delivered', 'cancelled'],
    'delivered': ['return-requested'],
    'cancelled': [],
    'return-requested': ['return-approved', 'return-rejected'],
    'return-approved': ['refunded'],
    'return-rejected': [],
    'refunded': []
  };

  static canTransition(currentStatus, newStatus) {
    return this.STATE_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
  }

  async createOrder(userId, items, shippingAddress, couponCode) {
    // Validate inventory
    // Create order record
    // Update inventory
    // Create order status event
    // Log to activity
  }

  async confirmOrder(orderId) {
    // Verify payment
    // Transition to confirmed
    // Trigger notifications
  }

  async assignDeliveryPartner(orderId, partnerId) {
    // Check partner availability
    // Create assignment
    // Transition order to assigned
    // Notify partner & customer
  }

  async cancelOrder(orderId, reason) {
    // Validate order can be cancelled
    // Create return request for refund
    // Update inventory (restore stock)
    // Trigger refund processing
    // Notify customer
  }

  async rescheduleOrder(orderId, newSlotId) {
    // Validate order status
    // Check slot availability
    // Update delivery slot
    // Notify customer & partner
  }

  async completeOrder(orderId) {
    // Mark as delivered
    // Record delivery time
    // Request customer review
    // Update metrics
  }
}

module.exports = OrderService;
```

#### Task 4.2: Create Order Controller with cancellation
**File:** `server/controllers/orderController.js` (update)  
**Priority:** HIGH  
**Time:** 4-6 hours

**Add these endpoints:**
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - Get user orders
- `GET /api/v1/orders/:id` - Get order details
- `POST /api/v1/orders/:id/cancel` - Cancel order
- `POST /api/v1/orders/:id/reschedule` - Reschedule delivery
- `GET /api/v1/orders/:id/tracking` - Get real-time tracking

---

### TIER 5: Payment & Refund System

#### Task 5.1: Integrate Stripe Webhooks
**File:** `server/routes/stripe.js` (create webhooks)  
**Priority:** HIGH  
**Time:** 6-8 hours

```javascript
// server/routes/stripe.js

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { prisma } = require('../database/config');

const router = express.Router();

// Webhook for payment events
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    case 'charge.refunded':
      await handleRefund(event.data.object);
      break;
  }

  res.json({received: true});
});

async function handlePaymentSuccess(intent) {
  const orderId = intent.metadata.orderId;
  
  // Update payment transaction
  await prisma.paymentTransaction.update({
    where: { stripeId: intent.id },
    data: {
      status: 'success',
      processedAt: new Date(),
      webhookReceived: true
    }
  });

  // Update order payment status
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: 'paid' }
  });

  // Send confirmation email
  // Create order status event
}

async function handlePaymentFailed(intent) {
  const orderId = intent.metadata.orderId;
  await prisma.paymentTransaction.update({
    where: { stripeId: intent.id },
    data: {
      status: 'failed',
      errorMessage: intent.last_payment_error?.message,
      webhookReceived: true
    }
  });
}

async function handleRefund(charge) {
  // Handle refund in system
}

module.exports = router;
```

#### Task 5.2: Create Refund Service
**File:** `server/services/refundService.js` (new)  
**Priority:** HIGH  
**Time:** 4-6 hours

```javascript
class RefundService {
  async processRefund(orderId, amount, reason) {
    // Get Stripe payment intent ID
    // Call Stripe refund API
    // Update ReturnRequest status
    // Create return request if cancelled
    // Log transaction
    // Send notification
  }

  async handlePartialRefund(orderId, itemId, amount) {
    // Similar to full refund but for single item
  }

  async retryFailedPayment(orderId) {
    // Get payment transaction
    // Increment retry count
    // Attempt payment again via Stripe
    // Update transaction with result
  }

  async reconcilePayments() {
    // Run daily - verify payment status with Stripe
    // Update any mismatched records
    // Alert on discrepancies
  }
}
```

---

## 🎪 TIER 6: Real-time Features

#### Task 6.1: Setup Socket.io for Real-time Updates
**File:** `server/index.js` (update)  
**Priority:** MEDIUM  
**Time:** 4-6 hours

```javascript
// Add to server/index.js

const { createServer } = require('http');
const { Server } = require('socket.io');
const redis = require('@redis/client');

// HTTP server setup
const server = createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  adapter: require('socket.io-redis'),
});

// Redis pub/sub for multi-server support
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Socket event handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Subscribe to order updates
  socket.on('subscribe-order', (orderId) => {
    socket.join(`order:${orderId}`);
  });

  // Subscribe to delivery tracking
  socket.on('subscribe-tracking', (orderId) => {
    socket.join(`tracking:${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Export io for controllers
module.exports = { server, io };
```

#### Task 6.2: Implement Real-time Order Tracking
**File:** `server/services/trackingService.js` (new)  
**Priority:** MEDIUM  
**Time:** 4-6 hours

```javascript
class TrackingService {
  constructor(io) {
    this.io = io;
  }

  async updateDeliveryLocation(assignmentId, latitude, longitude) {
    // Save to DeliveryTracking table
    // Broadcast to subscribed users
    this.io.to(`tracking:${assignmentId}`).emit('location-update', {
      latitude,
      longitude,
      timestamp: new Date()
    });
  }

  async updateOrderStatus(orderId, newStatus) {
    // Create OrderStatusEvent
    // Broadcast to subscribed users
    this.io.to(`order:${orderId}`).emit('status-update', {
      status: newStatus,
      timestamp: new Date()
    });
  }

  async notifyDeliveryETA(orderId, etaMinutes) {
    this.io.to(`order:${orderId}`).emit('eta-update', {
      estimatedMinutes: etaMinutes
    });
  }
}
```

---

## 🎨 TIER 7: Frontend State Management (Zustand)

#### Task 7.1: Create Zustand Stores
**File:** `client/src/store/index.js` (replace context)  
**Priority:** HIGH  
**Time:** 6-8 hours

```javascript
// client/src/store/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {`javascript
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { email, password });
          set({
            user: response.data.user,
            token: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            isLoading: false
          });
          return true;
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      logout: async () => {
        const token = get().token;
        try {
          await api.post('/auth/logout', {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
        set({ user: null, token: null, refreshToken: null });
      },

      refreshAccessToken: async () => {
        try {
          const response = await api.post('/auth/refresh', {
            refreshToken: get().refreshToken
          });
          set({ token: response.data.accessToken });
          return true;
        } catch (error) {
          get().logout();
          return false;
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken
      })
    }
  )
);

// client/src/store/cartStore.js
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      deliverySlot: null,

      addItem: (product, quantity, weight) => {
        const items = get().items;
        const existing = items.find(i => i.id === product.id && i.weight === weight);
        
        if (existing) {
          set({
            items: items.map(i =>
              i.id === product.id && i.weight === weight
                ? { ...i, quantity: i.quantity + quantity }
                : i
            )
          });
        } else {
          set({
            items: [...items, { ...product, quantity, weight }]
          });
        }
      },

      removeItem: (productId, weight) => {
        set({
          items: get().items.filter(i => !(i.id === productId && i.weight === weight))
        });
      },

      updateWeight: (productId, oldWeight, newWeight) => {
        const items = get().items;
        const item = items.find(i => i.id === productId && i.weight === oldWeight);
        
        if (item) {
          set({
            items: items.map(i =>
              i.id === productId && i.weight === oldWeight
                ? { ...i, weight: newWeight }
                : i
            )
          });
        }
      },

      applyCoupon: (code, discountPercentage) => {
        set({ coupon: { code, discountPercentage } });
      },

      removeCoupon: () => {
        set({ coupon: null });
      },

      setDeliverySlot: (slot) => {
        set({ deliverySlot: slot });
      },

      getTotalPrice: () => {
        const items = get().items;
        const subtotal = items.reduce((sum, item) => {
          return sum + (item.pricePerKg * item.weight * item.quantity);
        }, 0);

        const coupon = get().coupon;
        const discount = coupon ? (subtotal * coupon.discountPercentage / 100) : 0;
        
        return {
          subtotal,
          discount,
          total: subtotal - discount
        };
      },

      clear: () => {
        set({ items: [], coupon: null, deliverySlot: null });
      }
    }),
    { name: 'cart-storage' }
  )
);

// Similar stores for:
// - productStore
// - wishlistStore
// - deliveryStore
// - notificationStore
// - uiStore
```

---

#### Task 7.2: Create Centralized API Service
**File:** `client/src/services/api.js` (new)  
**Priority:** HIGH  
**Time:** 3-4 hours

```javascript
// client/src/services/api.js
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshed = await useAuthStore.getState().refreshAccessToken();
      if (refreshed) {
        const token = useAuthStore.getState().token;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    // Format error response
    const errorMessage = error.response?.data?.error?.message || error.message;
    return Promise.reject({
      status: error.response?.status,
      message: errorMessage,
      data: error.response?.data
    });
  }
);

export default api;
```

---

## 📋 VALIDATION CHECKLIST

### Backend Implementation
- [ ] Prisma schema extended with all new models
- [ ] Database migrations run successfully
- [ ] JWT refresh token system working
- [ ] Logout endpoint revokes tokens
- [ ] Error handler middleware in place
- [ ] Validation middleware on all routes
- [ ] Order status state machine implemented
- [ ] Cancel order triggers refund
- [ ] Stripe webhook handlers working
- [ ] Socket.io real-time updates functioning
- [ ] Redis caching active
- [ ] All API endpoints return standardized format

### Frontend Implementation
- [ ] All Context API migrated to Zustand
- [ ] Centralized API service with interceptors
- [ ] Auth token refresh working
- [ ] Cart calculations correct
- [ ] Delivery slot selector built
- [ ] Order tracking page with real-time updates
- [ ] Return/refund flow implemented
- [ ] Address management page
- [ ] Notification preferences page
- [ ] Review submission modal
- [ ] All forms validated
- [ ] Loading states on buttons
- [ ] Error notifications showing

---

**This is your implementation roadmap. Follow each task in sequence. Each completed task enables the next.**
