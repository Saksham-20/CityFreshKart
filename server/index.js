const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { assertJwtSecretForProduction } = require('./config/jwt');
assertJwtSecretForProduction();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const razorpayRoutes = require('./routes/razorpay');
const cartRoutes = require('./routes/cart');
const addressRoutes = require('./routes/addresses');
const notificationRoutes = require('./routes/notifications');
const marketingRoutes = require('./routes/marketing');
const { collectCspConnectOrigins } = require('./utils/cspOrigins');

const app = express();
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === 'production') {
  const hasRazorpay = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  if (!hasRazorpay) {
    console.warn('⚠️ Razorpay keys are missing in production. Online payment will be unavailable.');
  }
}

// Behind Nginx / Cloudflare / ALB — required for correct client IP in rate limiting
if (process.env.NODE_ENV === 'production') {
  const hops = parseInt(process.env.TRUST_PROXY_HOPS, 10);
  app.set('trust proxy', Number.isFinite(hops) && hops >= 0 ? hops : 1);
}

// Security middleware - enabled for production
if (process.env.NODE_ENV === 'production') {
  const connectSrc = collectCspConnectOrigins();
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc,
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:5000', 'http://localhost:3000'],
      },
    },
  }));
}

// Middleware - order matters! CORS should be first
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL, process.env.CORS_ORIGIN].filter(Boolean)
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

// Apply CORS BEFORE other middleware
app.use(cors(corsOptions));

// Cookie parser - for accessing httpOnly cookies
app.use(cookieParser());

// Rate limiting - applied after CORS (relaxed in development for automated testing)
// Skip cheap/public routes and /api/auth (auth routes use authLimiter separately).
const parsedWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10);
const parsedMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10);
const limiter = rateLimit({
  windowMs: Number.isFinite(parsedWindow) && parsedWindow > 0 ? parsedWindow : 15 * 60 * 1000,
  max: Number.isFinite(parsedMax) && parsedMax > 0
    ? parsedMax
    : (process.env.NODE_ENV === 'production' ? 500 : 10000),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const url = req.originalUrl || req.url || '';
    if (req.method === 'GET' && (url === '/api/health' || url.startsWith('/api/health?'))) return true;
    if (req.method === 'GET' && (url === '/api/settings' || url.startsWith('/api/settings?'))) return true;
    if (url.startsWith('/api/auth')) return true;
    return false;
  },
});
app.use('/api/', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
const uploadRoot = path.join(__dirname, 'uploads');
['products', 'users', 'general'].forEach((folder) => {
  fs.mkdirSync(path.join(uploadRoot, folder), { recursive: true });
});

app.use('/uploads', express.static(uploadRoot, {
  maxAge: '7d',
  etag: true,
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
console.log('✅ Admin routes registered at /api/admin');
app.use('/api/razorpay', razorpayRoutes);
console.log('✅ Razorpay routes registered at /api/razorpay');
app.use('/api/cart', cartRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/marketing', marketingRoutes);

// Explicit deprecation for removed wishlist feature
app.use('/api/wishlist', (req, res) => {
  res.status(410).json({
    success: false,
    message: 'Wishlist feature has been removed',
  });
});

// Public store settings endpoint (read-only, no auth required)
app.get('/api/settings', async (req, res) => {
  try {
    const { pool } = require('./database/config');
    const result = await pool.query('SELECT key, value FROM store_settings ORDER BY key');
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('GET /api/settings: database error, returning defaults', error.message);
    res.json({ success: true, data: { free_delivery_threshold: '300', delivery_fee: '50', min_order_amount: '0' } });
  }
});

// Serve React build in production (single-origin deploy: web + api)
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
  app.use(express.static(clientBuildPath));

  // SPA fallback (must be after API routes)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
    return res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    },
  });
});

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Run database setup
    const setupDatabase = require('./database/setup');
    await setupDatabase();

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 CityFreshKart server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
