const { createClient } = require('redis');
const { logStructured } = require('../utils/requestContext');

let client = null;
let connectPromise = null;
let warnedNoUrl = false;
/** When true, skip all Redis I/O until process restart (optional Redis degraded). */
let redisCircuitOpen = false;

let redisErrorLogTs = 0;
const REDIS_ERROR_LOG_INTERVAL_MS = 30_000;

let redisErrorsInWindow = 0;
let redisErrorWindowStart = 0;
const REDIS_ERROR_WINDOW_MS = 5_000;
const REDIS_ERROR_CIRCUIT_THRESHOLD = 12;

/** @type {((reason: string) => void) | null} */
let onRedisDisabled = null;

function registerRedisDisabledHandler(fn) {
  onRedisDisabled = typeof fn === 'function' ? fn : null;
}

/** node-redis disconnect() is async; calling it without await can surface ClientClosedError as an unhandled rejection. */
async function safeCloseRedis(redisClient) {
  if (!redisClient) return;
  try {
    redisClient.removeAllListeners('error');
    redisClient.removeAllListeners('end');
  } catch (_) { /* ignore */ }
  try {
    await redisClient.disconnect();
  } catch (_) {
    /* ClientClosedError if already torn down */
  }
}

function describeRedisError(err) {
  if (!err) return 'unknown';
  const msg = err.message != null ? String(err.message).trim() : '';
  if (msg) return msg;
  if (err.code) return String(err.code);
  if (typeof err.toString === 'function') {
    const s = err.toString();
    if (s && s !== '[object Object]') return s;
  }
  return err.constructor?.name || 'RedisError';
}

function logRedisErrorThrottled(err, extra = {}) {
  const now = Date.now();
  if (now - redisErrorLogTs < REDIS_ERROR_LOG_INTERVAL_MS) return;
  redisErrorLogTs = now;
  logStructured('warn', {
    event: 'redis_client_error',
    message: describeRedisError(err),
    ...extra,
  });
}

function notifyDisabled(reason) {
  if (typeof onRedisDisabled === 'function') {
    try {
      onRedisDisabled(reason);
    } catch (_) { /* ignore */ }
  }
}

function openRedisCircuit(reason) {
  if (redisCircuitOpen) return;
  redisCircuitOpen = true;
  logStructured('warn', { event: 'redis_circuit_open', message: reason });
  notifyDisabled(reason);
  const toClose = client;
  client = null;
  connectPromise = null;
  void safeCloseRedis(toClose);
}

function isRedisConfigured() {
  return !!(process.env.REDIS_URL && String(process.env.REDIS_URL).trim());
}

function isRedisCircuitOpen() {
  return redisCircuitOpen;
}

/**
 * Returns connected Redis client or null (graceful degradation).
 */
async function getRedis() {
  if (!isRedisConfigured()) {
    if (!warnedNoUrl && process.env.NODE_ENV === 'production') {
      warnedNoUrl = true;
      logStructured('warn', {
        event: 'redis_disabled',
        message: 'REDIS_URL not set; caching and cluster rate limits use memory fallback',
      });
    }
    return null;
  }
  if (redisCircuitOpen) return null;
  if (client?.isOpen) return client;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    let c;
    try {
      c = createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 10_000,
          reconnectStrategy: (retries) => {
            if (retries > 4) {
              setImmediate(() => {
                openRedisCircuit('Redis reconnect limit exceeded; optional Redis disabled until restart');
              });
              return new Error('Redis reconnect stopped');
            }
            return Math.min(retries * 200, 2000);
          },
        },
      });

      c.on('error', (err) => {
        const now = Date.now();
        if (now - redisErrorWindowStart > REDIS_ERROR_WINDOW_MS) {
          redisErrorsInWindow = 0;
          redisErrorWindowStart = now;
        }
        redisErrorsInWindow += 1;
        logRedisErrorThrottled(err, { errorsInWindow: redisErrorsInWindow });
        if (redisErrorsInWindow >= REDIS_ERROR_CIRCUIT_THRESHOLD) {
          openRedisCircuit('Too many Redis errors in a short window');
        }
      });

      await c.connect();
      await c.ping();
      redisErrorsInWindow = 0;
      client = c;
      logStructured('warn', { event: 'redis_connected', message: 'Redis connected' });
      return c;
    } catch (e) {
      client = null;
      connectPromise = null;
      redisCircuitOpen = true;
      await safeCloseRedis(c);
      logStructured('warn', {
        event: 'redis_connect_failed',
        message: describeRedisError(e),
      });
      notifyDisabled(`Redis connect/PING failed: ${describeRedisError(e)}`);
      return null;
    }
  })();

  return connectPromise;
}

async function cacheGet(key) {
  if (redisCircuitOpen) return null;
  const c = await getRedis();
  if (!c) return null;
  try {
    return await c.get(key);
  } catch (e) {
    logStructured('warn', { event: 'redis_get_failed', key, message: describeRedisError(e) });
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds) {
  if (redisCircuitOpen) return false;
  const c = await getRedis();
  if (!c) return false;
  try {
    if (ttlSeconds && ttlSeconds > 0) await c.setEx(key, ttlSeconds, value);
    else await c.set(key, value);
    return true;
  } catch (e) {
    logStructured('warn', { event: 'redis_set_failed', key, message: describeRedisError(e) });
    return false;
  }
}

async function cacheDel(...keys) {
  if (redisCircuitOpen || keys.length === 0) return;
  const c = await getRedis();
  if (!c) return;
  try {
    await c.del(keys);
  } catch (e) {
    logStructured('warn', { event: 'redis_del_failed', keys, message: describeRedisError(e) });
  }
}

module.exports = {
  getRedis,
  cacheGet,
  cacheSet,
  cacheDel,
  isRedisConfigured,
  isRedisCircuitOpen,
  registerRedisDisabledHandler,
};
