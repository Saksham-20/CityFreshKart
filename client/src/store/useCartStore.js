import { create } from 'zustand';
import api from '../services/api';
import { resolveBasePriceForWeight } from '../utils/weightSystem';

const useCartStore = create((set, get) => ({
  // State
  items: [],
  loading: false,
  error: null,

  // Dynamic settings (loaded from /api/settings on app init)
  freeDeliveryThreshold: 300,
  deliveryFeeAmount: 50,
  minOrderAmount: 0,

  // Load store settings from the public API endpoint
  loadSettings: async () => {
    try {
      // Prefer configured API base (axios instance), then fall back to common dev ports.
      let json;
      try {
        const res = await api.get('/settings');
        json = res.data;
      } catch (e) {
        try {
          const res = await fetch('http://localhost:5000/api/settings');
          json = await res.json();
        } catch (e2) {
          const res = await fetch('/api/settings');
          json = await res.json();
        }
      }

      const data = json?.data || {};
      set({
        freeDeliveryThreshold: parseFloat(data.free_delivery_threshold) || 300,
        deliveryFeeAmount: parseFloat(data.delivery_fee) || 50,
        minOrderAmount: parseFloat(data.min_order_amount) || 0,
      });
    } catch (_) {
      // keep defaults on error
    }
  },

  // Calculate cart summary using dynamic settings
  calculateSummary: () => {
    const { items, freeDeliveryThreshold, deliveryFeeAmount } = get();

    const subtotal = items.reduce((sum, item) => {
      const price = resolveBasePriceForWeight(item.price_per_kg || 0, item.quantity || 0, item.weight_price_overrides || {});
      const discountedPrice = item.discount ? price * (1 - item.discount / 100) : price;
      return sum + discountedPrice;
    }, 0);

    const deliveryFee = subtotal >= freeDeliveryThreshold ? 0 : deliveryFeeAmount;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      deliveryFee,
      total: parseFloat((subtotal + deliveryFee).toFixed(2)),
      itemCount: items.length,
    };
  },

  // Initialize cart from localStorage
  initialize: async () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        set({ items: JSON.parse(savedCart) });
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  },

  // Add item to cart
  addToCart: (product, quantity = 1) => {
    const items = get().items;
    const existingItem = items.find(i => i.id === product.id);

    if (existingItem) {
      const updated = items.map(i =>
        i.id === product.id
          ? { ...i, quantity: parseFloat((i.quantity + quantity).toFixed(2)) }
          : i,
      );
      set({ items: updated });
      localStorage.setItem('cart', JSON.stringify(updated));
    } else {
      const newItem = {
        id: product.id,
        name: product.name,
        price_per_kg: product.price_per_kg,
        discount: product.discount || 0,
        image_url: product.image_url || '',
        pricing_type: product.pricing_type || 'per_kg',
        weight_display_unit: product.pricing_type === 'per_piece'
          ? 'kg'
          : (product.weight_display_unit === 'g' ? 'g' : 'kg'),
        weight_price_overrides: product.weight_price_overrides || {},
        quantity,
      };
      const updated = [...items, newItem];
      set({ items: updated });
      localStorage.setItem('cart', JSON.stringify(updated));
    }
  },

  // Update item quantity
  updateItemQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    const items = get().items.map(i => i.id === productId ? { ...i, quantity } : i);
    set({ items });
    localStorage.setItem('cart', JSON.stringify(items));
  },

  // Remove item from cart
  removeFromCart: (productId) => {
    const items = get().items.filter(i => i.id !== productId);
    set({ items });
    localStorage.setItem('cart', JSON.stringify(items));
  },

  // Clear entire cart
  clearCart: () => {
    set({ items: [] });
    localStorage.removeItem('cart');
  },

  // Check if product is in cart
  isItemInCart: (productId) => get().items.some(i => i.id === productId),

  // Get cart item count
  getCartItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));

export { useCartStore };
