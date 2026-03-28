const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedis, isRedisConfigured } = require('../services/redisClient');
const { logStructured } = require('../utils/requestContext');

const defaultAuthWindowMs = 15 * 60 * 1000;
const parsedAuthWindow = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10);
const authWindowMs = Number.isFinite(parsedAuthWindow) && parsedAuthWindow > 0
  ? parsedAuthWindow
  : defaultAuthWindowMs;

const parsedAuthMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10);
const authMax = Number.isFinite(parsedAuthMax) && parsedAuthMax > 0
  ? parsedAuthMax
  : (process.env.NODE_ENV === 'production' ? 50 : 1000);

const parsedWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10);
const parsedMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10);
const globalWindowMs = Number.isFinite(parsedWindow) && parsedWindow > 0 ? parsedWindow : 15 * 60 * 1000;
const globalMax = Number.isFinite(parsedMax) && parsedMax > 0
  ? parsedMax
  : (process.env.NODE_ENV === 'production' ? 500 : 10000);

let redisStoreWarned = false;
let globalLimiterInstance = null;

async function createRedisStore() {
  if (!isRedisConfigured()) return null;
  const client = await getRedis();
  if (!client) return null;
  try {
    return new RedisStore({
      prefix: 'cfc:rl:',
      sendCommand: (...args) => client.sendCommand(args),
    });
  } catch (e) {
    if (!redisStoreWarned) {
      redisStoreWarned = true;
      logStructured('warn', { event: 'rate_limit_redis_store_failed', message: e.message });
    }
    return null;
  }
}

function rateLimitJsonHandler(req, res) {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
    ref: req.requestId,
    errorCode: 'RATE_LIMITED',
  });
}

/**
 * Global API limiter (optional Redis store for PM2 cluster / multi-instance).
 */
function buildGlobalApiLimiter(store) {
  return rateLimit({
    windowMs: globalWindowMs,
    max: globalMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitJsonHandler,
    skip: (req) => {
      const url = req.originalUrl || req.url || '';
      if (req.method === 'GET' && (url === '/api/health' || url.startsWith('/api/health?'))) return true;
      if (req.method === 'GET' && (url === '/api/settings' || url.startsWith('/api/settings?'))) return true;
      if (url.startsWith('/api/auth')) return true;
      return false;
    },
    ...(store ? { store } : {}),
  });
}

/** Call after DB setup, before app.listen — wires Redis-backed store when available */
async function primeGlobalApiLimiter() {
  const store = await createRedisStore();
  if (store) {
    logStructured('warn', { event: 'rate_limit_store', message: 'Using Redis store for global API rate limit' });
  }
  globalLimiterInstance = buildGlobalApiLimiter(store);
}

function globalApiLimiterMiddleware(req, res, next) {
  const lim = globalLimiterInstance || buildGlobalApiLimiter(null);
  if (!globalLimiterInstance) globalLimiterInstance = lim;
  return lim(req, res, next);
}

/** Called when Redis is disabled at runtime so the global limiter stops using a dead RedisStore. */
function fallbackGlobalLimiterToMemory() {
  globalLimiterInstance = buildGlobalApiLimiter(null);
  logStructured('warn', {
    event: 'rate_limit_redis_fallback',
    message: 'Global API rate limiter switched to in-memory store',
  });
}

const authLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMax,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitJsonHandler,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX, 10) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitJsonHandler,
});

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production'
    ? (parseInt(process.env.CHECKOUT_RATE_LIMIT_MAX, 10) || 20)
    : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitJsonHandler,
});

const adminProductWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production'
    ? (parseInt(process.env.ADMIN_PRODUCT_WRITE_MAX, 10) || 120)
    : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitJsonHandler,
  keyGenerator: (req) => (req.user?.id ? `uid:${req.user.id}` : req.ip),
});

module.exports = {
  primeGlobalApiLimiter,
  globalApiLimiterMiddleware,
  fallbackGlobalLimiterToMemory,
  buildGlobalApiLimiter,
  authLimiter,
  uploadLimiter,
  checkoutLimiter,
  adminProductWriteLimiter,
};
