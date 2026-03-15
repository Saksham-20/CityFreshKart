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
  const basePrice = pricePerKg * weight;
  const finalPrice = Math.max(0, basePrice - discount);

  return {
    pricePerKg,
    weight,
    basePrice: Math.round(basePrice * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    discountPercentage: discount > 0 ? Math.round((discount / basePrice) * 100) : 0,
  };
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
  return `₹${Math.round(price).toLocaleString('en-IN')}`;
};

/**
 * Format weight for display
 * @param {number} weight
 * @returns {string} Formatted weight
 */
export const formatWeight = (weight) => {
  if (weight < 1) {
    return `${Math.round(weight * 1000)}g`;
  }
  return `${weight}kg`;
};
