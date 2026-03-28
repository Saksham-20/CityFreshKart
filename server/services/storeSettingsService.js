const { query } = require('../database/config');
const {
  getCachedStoreSettingsOrderJson,
  setCachedStoreSettingsOrderJson,
} = require('./cachePublic');

/**
 * Batch load order-related store settings (single round-trip, optional Redis cache-aside).
 */
async function getStoreOrderSettings() {
  const cached = await getCachedStoreSettingsOrderJson();
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.free_delivery_threshold === 'number') return parsed;
    } catch (_) { /* fall through */ }
  }

  const out = {
    free_delivery_threshold: 300,
    delivery_fee: 50,
    min_order_amount: 0,
  };
  try {
    const result = await query(
      `SELECT key, value FROM store_settings WHERE key = ANY($1::text[])`,
      [['free_delivery_threshold', 'delivery_fee', 'min_order_amount']],
    );
    for (const row of result.rows) {
      const v = parseFloat(row.value);
      if (!Number.isFinite(v)) continue;
      if (row.key === 'free_delivery_threshold') out.free_delivery_threshold = v;
      else if (row.key === 'delivery_fee') out.delivery_fee = v;
      else if (row.key === 'min_order_amount') out.min_order_amount = v;
    }
  } catch (_) { /* table may not exist yet */ }

  await setCachedStoreSettingsOrderJson(JSON.stringify(out));
  return out;
}

module.exports = { getStoreOrderSettings };
