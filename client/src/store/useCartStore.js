import { create } from 'zustand';
import api from '../services/api';
import { getCartLineTotal, getTierWeightsFromOverrides } from '../utils/weightSystem';
import { getPublicApiOrigin } from '../utils/publicOrigin';

const normalizeQuantityForItem = (item, quantity) => {
  const q = Number(quantity);
  if (!Number.isFinite(q) || q <= 0) return 0;
  const tiers = getTierWeightsFromOverrides(item.weight_price_overrides || {});
  if (tiers.length > 0) {
    const exact = tiers.find((t) => Math.abs(t - q) < 1e-6);
    if (exact) return exact;
    return tiers[0];
  }
  if (item.pricing_type === 'per_piece') {
    return Math.max(1, Math.round(q));
  }
  return parseFloat(q.toFixed(2));
};

/** Match cart row by stable line id (legacy: lineId was omitted, use product id). */
const rowMatches = (item, lineKey) => {
  if (item.lineId != null && item.lineId !== '') {
    return item.lineId === lineKey;
  }
  return item.id === lineKey;
};

const migrateCartItems = (rawItems) => {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((i, idx) => {
    const packCount = Math.max(1, parseInt(i.packCount, 10) || 1);
    const lineId = i.lineId || i.id || `legacy-${idx}`;
    return { ...i, lineId, packCount };
  });
};

const persist = (items) => {
  localStorage.setItem('cart', JSON.stringify(items));
};

const useCartStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,

  freeDeliveryThreshold: 300,
  deliveryFeeAmount: 50,
  minOrderAmount: 0,

  loadSettings: async () => {
    try {
      let json;
      try {
        const res = await api.get('/settings');
        json = res.data;
      } catch (e) {
        try {
          const res = await fetch(`${getPublicApiOrigin()}/api/settings`);
          json = await res.json();
        } catch (e2) {
          const res = await fetch('/api/settings');
          json = await res.json();
        }
      }

      const data = json?.data || {};
      const parsed = {
        freeDeliveryThreshold: data.free_delivery_threshold !== undefined && data.free_delivery_threshold !== null && data.free_delivery_threshold !== '' 
          ? parseFloat(data.free_delivery_threshold) 
          : 300,
        deliveryFeeAmount: data.delivery_fee !== undefined && data.delivery_fee !== null && data.delivery_fee !== '' 
          ? parseFloat(data.delivery_fee) 
          : 50,
        minOrderAmount: data.min_order_amount !== undefined && data.min_order_amount !== null && data.min_order_amount !== '' 
          ? parseFloat(data.min_order_amount) 
          : 0,
      };
      
      // Only update if parsed values are valid numbers
      if (Number.isFinite(parsed.freeDeliveryThreshold) && Number.isFinite(parsed.deliveryFeeAmount) && Number.isFinite(parsed.minOrderAmount)) {
        set(parsed);
      }
    } catch (_) {
      // keep defaults on error
    }
  },

  calculateSummary: () => {
    const { items, freeDeliveryThreshold, deliveryFeeAmount } = get();

    const subtotal = items.reduce((sum, item) => sum + getCartLineTotal(item), 0);

    const deliveryFee = subtotal >= freeDeliveryThreshold ? 0 : deliveryFeeAmount;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      deliveryFee,
      total: parseFloat((subtotal + deliveryFee).toFixed(2)),
      itemCount: items.length,
    };
  },

  initialize: async () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        const items = migrateCartItems(parsed);
        set({ items });
        persist(items);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  },

  addToCart: (product, quantity = 1) => {
    const items = get().items;
    const productOverrides = product.weight_price_overrides || {};
    const tiers = getTierWeightsFromOverrides(productOverrides);
    const stub = {
      ...product,
      weight_price_overrides: productOverrides,
      pricing_type: product.pricing_type || 'per_kg',
    };
    const normalizedQty = normalizeQuantityForItem(stub, quantity);

    if (tiers.length > 0) {
      const existingItem = items.find((i) => {
        if (i.id !== product.id) return false;
        const nEq = normalizeQuantityForItem(i, i.quantity);
        return Math.abs(nEq - normalizedQty) < 1e-6;
      });
      if (existingItem) {
        const key = existingItem.lineId || existingItem.id;
        const updated = items.map((i) =>
          rowMatches(i, key)
            ? { ...i, packCount: (i.packCount || 1) + 1 }
            : i,
        );
        set({ items: updated });
        persist(updated);
        return;
      }
    } else {
      const existingItem = items.find((i) => i.id === product.id);
      if (existingItem) {
        const key = existingItem.lineId || existingItem.id;
        const mergedQty = normalizeQuantityForItem(
          existingItem,
          existingItem.quantity + quantity,
        );
        const updated = items.map((i) =>
          rowMatches(i, key) ? { ...i, quantity: mergedQty } : i,
        );
        set({ items: updated });
        persist(updated);
        return;
      }
    }

    const newItem = {
      lineId: crypto.randomUUID(),
      id: product.id,
      name: product.name,
      price_per_kg: product.price_per_kg,
      discount: product.discount || 0,
      image_url: product.image_url || '',
      pricing_type: product.pricing_type || 'per_kg',
      weight_display_unit: product.pricing_type === 'per_piece'
        ? 'kg'
        : (product.weight_display_unit === 'g' ? 'g' : 'kg'),
      weight_price_overrides: productOverrides,
      quantity: normalizedQty,
      packCount: 1,
    };
    const updated = [...items, newItem];
    set({ items: updated });
    persist(updated);
  },

  adjustPackCount: (lineKey, delta) => {
    const items = get().items;
    const item = items.find((i) => rowMatches(i, lineKey));
    if (!item) return;
    const next = (item.packCount || 1) + delta;
    if (next < 1) {
      get().removeFromCart(lineKey);
      return;
    }
    const updated = items.map((i) =>
      rowMatches(i, lineKey) ? { ...i, packCount: next } : i,
    );
    set({ items: updated });
    persist(updated);
  },

  updateItemQuantity: (lineKey, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(lineKey);
      return;
    }
    const items = get().items.map((i) =>
      rowMatches(i, lineKey)
        ? { ...i, quantity: normalizeQuantityForItem(i, quantity) }
        : i,
    );
    set({ items });
    persist(items);
  },

  removeFromCart: (lineKey) => {
    const items = get().items.filter((i) => !rowMatches(i, lineKey));
    set({ items });
    persist(items);
  },

  // Remove a whole product from cart (all its weight-tier rows).
  removeProductFromCart: (productId) => {
    const pid = productId == null ? '' : String(productId);
    const items = get().items.filter((i) => String(i.id) !== pid);
    set({ items });
    persist(items);
  },

  clearCart: () => {
    set({ items: [] });
    localStorage.removeItem('cart');
  },

  isItemInCart: (productId) => get().items.some((i) => i.id === productId),

  getCartItemCount: () => get().items.reduce((sum, item) => {
    const packs = item.packCount || 1;
    const q = Number(item.quantity) || 0;
    return sum + q * packs;
  }, 0),
}));

export { useCartStore };
