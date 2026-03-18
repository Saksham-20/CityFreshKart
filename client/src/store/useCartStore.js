import { create } from 'zustand';
import api from '../services/api';

const useCartStore = create((set, get) => ({
  // State
  items: [],
  loading: false,
  error: null,

  // Calculate cart summary (price_per_kg × quantity_kg, apply discount if exists)
  calculateSummary: () => {
    const items = get().items;
    
    const subtotal = items.reduce((sum, item) => {
      const price = item.price_per_kg * item.quantity;
      const discountedPrice = item.discount ? price * (1 - item.discount / 100) : price;
      return sum + discountedPrice;
    }, 0);

    // Free delivery above ₹300
    const deliveryFee = subtotal >= 300 ? 0 : 50; // or your actual delivery fee

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

  // Add item to cart (or update quantity if exists)
  addToCart: (product, quantity = 1) => {
    const items = get().items;
    const existingItem = items.find(i => i.id === product.id);

    if (existingItem) {
      // Update quantity if product already in cart
      const updated = items.map(i =>
        i.id === product.id
          ? { ...i, quantity: i.quantity + quantity }
          : i
      );
      set({ items: updated });
      localStorage.setItem('cart', JSON.stringify(updated));
    } else {
      // Add new product to cart
      const newItem = {
        id: product.id,
        name: product.name,
        price_per_kg: product.price,
        discount: product.discount || 0,
        image: product.image || product.image_url,
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

    const items = get().items.map(i =>
      i.id === productId
        ? { ...i, quantity }
        : i
    );
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
  isItemInCart: (productId) => {
    return get().items.some(i => i.id === productId);
  },

  // Get cart item count
  getCartItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));

export { useCartStore };
