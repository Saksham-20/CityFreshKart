const crypto = require('crypto');
const { cacheGet, cacheSet, cacheDel } = require('./redisClient');

const KEYS = {
  PRODUCT_CATEGORIES_JSON: 'cfc:v1:product_categories_json',
  STORE_SETTINGS_ORDER_JSON: 'cfc:v1:store_settings_order_json',
};

const TTL = {
  PRODUCT_CATEGORIES_SEC: parseInt(process.env.CACHE_TTL_CATEGORIES_SEC, 10) || 120,
  STORE_SETTINGS_SEC: parseInt(process.env.CACHE_TTL_STORE_SETTINGS_SEC, 10) || 60,
};

async function getCachedProductCategoriesJson() {
  return cacheGet(KEYS.PRODUCT_CATEGORIES_JSON);
}

async function setCachedProductCategoriesJson(jsonString) {
  await cacheSet(KEYS.PRODUCT_CATEGORIES_JSON, jsonString, TTL.PRODUCT_CATEGORIES_SEC);
}

async function invalidateProductCategories() {
  await cacheDel(KEYS.PRODUCT_CATEGORIES_JSON);
}

async function getCachedStoreSettingsOrderJson() {
  return cacheGet(KEYS.STORE_SETTINGS_ORDER_JSON);
}

async function setCachedStoreSettingsOrderJson(jsonString) {
  await cacheSet(KEYS.STORE_SETTINGS_ORDER_JSON, jsonString, TTL.STORE_SETTINGS_SEC);
}

async function invalidateStoreSettingsOrder() {
  await cacheDel(KEYS.STORE_SETTINGS_ORDER_JSON);
}

/** Normalize idempotency key from header or body */
function normalizeIdempotencyKey(raw) {
  if (raw === undefined || raw === null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  const h = crypto.createHash('sha256').update(s).digest('hex');
  return h.slice(0, 64);
}

module.exports = {
  KEYS,
  TTL,
  getCachedProductCategoriesJson,
  setCachedProductCategoriesJson,
  invalidateProductCategories,
  getCachedStoreSettingsOrderJson,
  setCachedStoreSettingsOrderJson,
  invalidateStoreSettingsOrder,
  normalizeIdempotencyKey,
};
