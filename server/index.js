const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const razorpayRoutes = require('./routes/razorpay');
const cartRoutes = require('./routes/cart');
const addressRoutes = require('./routes/addresses');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware - enabled for production
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:5000', 'http://localhost:3000'],
      },
    },
  }));
}

// Middleware - order matters! CORS should be first
app.use(compression());

// CORS configuration with debugging
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL, process.env.CORS_ORIGIN].filter(Boolean)
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  optionsSuccessStatus: 200,
};

console.log('🌐 CORS Configuration:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
console.log('CORS Origin:', corsOptions.origin);

// Apply CORS BEFORE other middleware
app.use(cors(corsOptions));

// Cookie parser - for accessing httpOnly cookies
app.use(cookieParser());

// Rate limiting - applied after CORS
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

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
console.log('🔗 Registering API routes...');
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes registered at /api/auth');
app.use('/api/products', productRoutes);
console.log('✅ Product routes registered at /api/products');
app.use('/api/orders', orderRoutes);
console.log('✅ Order routes registered at /api/orders');
app.use('/api/users', userRoutes);
console.log('✅ User routes registered at /api/users');
app.use('/api/admin', adminRoutes);
console.log('✅ Admin routes registered at /api/admin');
app.use('/api/razorpay', razorpayRoutes);
console.log('✅ Razorpay routes registered at /api/razorpay');
app.use('/api/cart', cartRoutes);
console.log('✅ Cart routes registered at /api/cart');
app.use('/api/addresses', addressRoutes);
console.log('✅ Address routes registered at /api/addresses');

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

// 404 handler for API routes
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('🚀 Starting CityFreshKart server...');
    console.log('🚀 Environment variables check:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - PORT:', process.env.PORT);
    console.log('  - CLIENT_URL:', process.env.CLIENT_URL);
    console.log('  - CORS_ORIGIN:', process.env.CORS_ORIGIN);
    console.log('  - JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
    console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

    // Run database setup
    const setupDatabase = require('./database/setup');
    await setupDatabase();

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 CityFreshKart server running on port ${PORT}`);
      console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
      console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('🚀 Server startup completed successfully!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
