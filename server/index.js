const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
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
const { errorLogger, logger } = require('./utils/logger');
const { attachRequestId, logStructured } = require('./utils/requestContext');
const {
  primeGlobalApiLimiter,
  globalApiLimiterMiddleware,
  fallbackGlobalLimiterToMemory,
} = require('./middleware/rateLimit');
const redisClient = require('./services/redisClient');
redisClient.registerRedisDisabledHandler(() => fallbackGlobalLimiterToMemory());

const app = express();
const PORT = process.env.PORT || 5000;

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
  origin: (origin, callback) => {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [process.env.CLIENT_URL, process.env.CORS_ORIGIN].filter(Boolean)
      : ['*'];
    
    // Allow requests with no origin (same-origin) or from allowed origins
    // Important: Android browsers may send requests without origin header
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, log but still allow for mobile compatibility
      if (process.env.NODE_ENV === 'production') {
        logStructured('warn', { event: 'cors_origin_mismatch', origin, allowed: allowedOrigins });
        callback(null, true); // Allow anyway for mobile clients
      } else {
        callback(null, true); // Allow all in dev
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
  exposedHeaders: ['X-Request-Id'],
  optionsSuccessStatus: 200,
};

// Apply CORS BEFORE other middleware
app.use(cors(corsOptions));

// Cookie parser - for accessing httpOnly cookies
app.use(cookieParser());

// Correlate logs and client errors (X-Request-Id)
app.use('/api', attachRequestId);

// Global API rate limit (Redis-backed when REDIS_URL is set — primed in startServer)
app.use('/api/', globalApiLimiterMiddleware);
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

// API health check (optional DB ping for load balancers)
app.get('/api/health', async (req, res) => {
  const base = {
    status: 'OK',
    message: 'API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };
  if (process.env.ENABLE_DEEP_HEALTH === '1') {
    try {
      const { pool } = require('./database/config');
      await pool.query('SELECT 1');
      return res.status(200).json({ ...base, database: 'ok' });
    } catch (e) {
      return res.status(503).json({
        ...base,
        status: 'DEGRADED',
        database: 'error',
        ref: req.requestId,
      });
    }
  }
  res.status(200).json(base);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/razorpay', razorpayRoutes);
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
    const defaults = {
      free_delivery_threshold: '300',
      delivery_fee: '50',
      min_order_amount: '0',
    };
    
    try {
      const result = await pool.query('SELECT key, value FROM store_settings ORDER BY key');
      const settings = { ...defaults };
      result.rows.forEach(row => { 
        if (settings.hasOwnProperty(row.key)) {
          settings[row.key] = row.value; 
        }
      });
      res.json({ success: true, data: settings });
    } catch (dbError) {
      logStructured('warn', {
        requestId: req.requestId,
        event: 'settings_query_fallback',
        message: dbError.message,
      });
      // Return defaults if DB query fails
      res.json({ success: true, data: defaults });
    }
  } catch (error) {
    logStructured('error', {
      requestId: req.requestId,
      event: 'public_settings_error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
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
app.use(errorLogger);
app.use((err, req, res, next) => {
  if (err?.status === 413 || err?.type === 'entity.too.large' || err?.code === 'LIMIT_FILE_SIZE') {
    const ref = req.requestId || 'unknown';
    return res.status(413).json({
      success: false,
      ref,
      errorCode: 'REQUEST_TOO_LARGE',
      message:
        'Request payload too large. Use a smaller image or increase reverse proxy client_max_body_size above MAX_FILE_SIZE.',
    });
  }

  const ref = req.requestId || 'unknown';
  logStructured('error', {
    requestId: ref,
    event: 'unhandled_error',
    method: req.method,
    path: req.originalUrl || req.url,
    status: err.status || 500,
    errCode: err.code,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
  res.status(err.status || 500).json({
    success: false,
    ref,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    error: {
      code: err.code || 'SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      requestId: ref,
    },
  });
});

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  logStructured('warn', {
    requestId: req.requestId,
    event: 'api_404',
    method: req.method,
    path: req.originalUrl || req.url,
  });
  res.status(404).json({
    success: false,
    message: 'API route not found',
    ref: req.requestId,
    errorCode: 'NOT_FOUND',
  });
});

// Initialize database and start server
async function startServer() {
  try {
    const setupDatabase = require('./database/setup');
    await setupDatabase();
    await primeGlobalApiLimiter();

    app.listen(PORT, () => {
      console.log(`🚀 CityFreshKart server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  } catch (error) {
    logger.error('Failed to start server', { message: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();
