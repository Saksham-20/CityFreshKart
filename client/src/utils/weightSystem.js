/**
 * Weight System Utilities
 * Handles weight selection, pricing calculation, and discount logic
 */

export const WEIGHT_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 2.5, 3];

export const FREE_DELIVERY_THRESHOLD = 300; // ₹300

/**
 * Calculate price based on weight and per-kg price
 * @param {number} pricePerKg - Price per kilogram
 * @param {number} weight - Selected weight in kg
 * @param {number} discount - Optional discount amount
 * @returns {object} Pricing breakdown
 */
export const calculatePrice = (pricePerKg, weight, discount = 0) => {
  const price = Number(pricePerKg) || 0;
  const w = Number(weight) || 1;
  const disc = Number(discount) || 0;
  
  const basePrice = price * w;
  const finalPrice = Math.max(0, basePrice - disc);

  return {
    pricePerKg: price,
    weight: w,
    basePrice: Math.round(basePrice * 100) / 100,
    discount: Math.round(disc * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    discountPercentage: disc > 0 ? Math.round((disc / basePrice) * 100) : 0,
  };
};

export const resolveBasePriceForWeight = (pricePerKg, weight, weightPriceOverrides = {}) => {
  const w = Number(weight) || 1;
  const override = Number(weightPriceOverrides?.[w.toFixed(2)] ?? weightPriceOverrides?.[String(w)] ?? NaN);
  if (Number.isFinite(override) && override >= 0) return override;
  return (Number(pricePerKg) || 0) * w;
};

export const getTierWeightsFromOverrides = (weightPriceOverrides = {}) => {
  const weights = Object.keys(weightPriceOverrides || {})
    .map((k) => parseFloat(k))
    .filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(weights)].sort((a, b) => a - b);
};

export const getAdjacentTierWeight = (currentWeight, tiers = [], direction = 1) => {
  if (!Array.isArray(tiers) || tiers.length === 0) return currentWeight;
  const current = Number(currentWeight) || tiers[0];
  const normalized = [...tiers].sort((a, b) => a - b);
  const idx = normalized.findIndex((v) => Math.abs(v - current) < 1e-6);
  if (idx === -1) {
    if (direction > 0) return normalized.find((v) => v > current) ?? normalized[normalized.length - 1];
    return [...normalized].reverse().find((v) => v < current) ?? normalized[0];
  }
  const nextIdx = idx + (direction > 0 ? 1 : -1);
  if (nextIdx < 0 || nextIdx >= normalized.length) return normalized[idx];
  return normalized[nextIdx];
};

export const calculatePriceWithOverrides = (pricePerKg, weight, discount = 0, weightPriceOverrides = {}) => {
  const basePrice = resolveBasePriceForWeight(pricePerKg, weight, weightPriceOverrides);
  const disc = Number(discount) || 0;
  const finalPrice = basePrice * (1 - disc / 100);
  return {
    weight: Number(weight) || 1,
    basePrice: Math.round(basePrice * 100) / 100,
    discount: disc,
    finalPrice: Math.round(finalPrice * 100) / 100,
    discountPercentage: disc,
  };
};

/** Single cart row: tier override + discount (matches useCartStore.calculateSummary). */
export const getCartLineTotal = (item) => {
  const { finalPrice } = calculatePriceWithOverrides(
    item.price_per_kg || 0,
    item.quantity || 0,
    item.discount || 0,
    item.weight_price_overrides || {},
  );
  return finalPrice;
};

/** Cart line breakdown for UI (line total + whether admin tiers apply). */
export const getCartLinePricing = (item) => {
  const overrides = item.weight_price_overrides || {};
  const hasTiers = getTierWeightsFromOverrides(overrides).length > 0;
  const breakdown = calculatePriceWithOverrides(
    item.price_per_kg || 0,
    item.quantity || 0,
    item.discount || 0,
    overrides,
  );
  return { ...breakdown, hasTiers };
};

/**
 * Calculate delivery fee based on order total
 * @param {number} subtotal - Order subtotal
 * @returns {object} Delivery info
 */
export const calculateDelivery = (subtotal) => {
  const isFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee = isFreeDelivery ? 0 : 50; // ₹50 delivery fee if below threshold

  return {
    isFreeDelivery,
    deliveryFee,
    subtotal,
    total: subtotal + deliveryFee,
  };
};

/**
 * Format price for display
 * @param {number} price
 * @returns {string} Formatted price
 */
export const formatPrice = (price) => {
  const p = Number(price) || 0;
  return `₹${Math.round(p).toLocaleString('en-IN')}`;
};

/**
 * Format weight for display (legacy: sub-kg shown as grams)
 * @param {number} weight — kg
 * @returns {string} Formatted weight
 */
export const formatWeight = (weight) => {
  return formatWeightDisplay(weight, 'g');
};

/**
 * @param {number} weightKg
 * @param {'kg'|'g'} unit — admin preference for per-kg products
 */
export const formatWeightDisplay = (weightKg, unit = 'g') => {
  const w = Number(weightKg) || 0;
  if (w <= 0) return unit === 'kg' ? '0 kg' : '0g';
  if (unit === 'kg') {
    const rounded = Math.round(w * 1000) / 1000;
    const s = rounded % 1 === 0 ? String(rounded) : String(rounded).replace(/\.?0+$/, '');
    return `${s} kg`;
  }
  if (w < 1) {
    return `${Math.round(w * 1000)}g`;
  }
  const rounded = Math.round(w * 100) / 100;
  if (rounded % 1 === 0) return `${rounded}kg`;
  return `${rounded.toFixed(2).replace(/\.?0+$/, '')}kg`;
};

/** Cart/checkout: human-readable total weight or piece count */
export const formatCartQuantityLabel = (item) => {
  if (item.pricing_type === 'per_piece') {
    const q = Number(item.quantity) || 0;
    return `${q} ${q === 1 ? 'pc' : 'pcs'}`;
  }
  const u = item.weight_display_unit === 'g' ? 'g' : 'kg';
  return formatWeightDisplay(item.quantity, u);
};

/** Order line quantity (order items use quantity_kg + optional weight_display_unit) */
export const formatOrderLineQuantity = (item) => {
  if (item.pricing_type === 'per_piece') {
    const q = parseFloat(item.quantity_kg || 0);
    return `${q} ${q === 1 ? 'pc' : 'pcs'}`;
  }
  const u = item.weight_display_unit === 'g' ? 'g' : 'kg';
  return formatWeightDisplay(parseFloat(item.quantity_kg || 0), u);
};
