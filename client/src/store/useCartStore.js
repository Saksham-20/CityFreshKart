import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { toast } from 'react-hot-toast';
import api from '../services/api';

/**
 * PRICE CALCULATION FORMULA
 * final_price = (price_per_kg * weight) - discount
 * delivery_fee = subtotal >= 300 ? 0 : 30
 * 
 * Example:
 * - Product: Tomato @ ₹50/kg, 20% discount
 * - Customer selects: 2kg
 * - Item price: (50 * 2) - (50 * 2 * 0.20) = 100 - 20 = ₹80
 */
const calculateSummary = (items) => {
  const subtotal = items.reduce((sum, item) => {
    // Base price: price_per_kg * weight * quantity
    const basePrice = (item.price_per_kg || 0) * (item.weight || 1) * (item.quantity || 1);
    
    // Apply discount if exists
    const discountPercent = item.discount || 0;
    const discountAmount = basePrice * (discountPercent / 100);
    const itemPrice = basePrice - discountAmount;
    
    return sum + itemPrice;
  }, 0);

  // Calculate item count
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  
  // Free delivery if subtotal >= ₹300, else ₹30
  const deliveryFee = subtotal >= 300 ? 0 : 30;
  
  return {
    item_count: itemCount,
    subtotal: parseFloat(subtotal.toFixed(2)),
    delivery_fee: deliveryFee,
    estimated_total: parseFloat((subtotal + deliveryFee).toFixed(2)),
  };
};

const isAuthenticated = () => {
  try {
    const authStorage = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    return authStorage?.state?.isAuthenticated || false;
  } catch {
    return false;
  }
};

export const useCartStore = create(
  devtools(
    (set, get) => ({
      items: [],
      cartId: null,
      summary: { item_count: 0, subtotal: 0, delivery_fee: 0, estimated_total: 0 },
      isLoading: false,
      error: null,

      loadUserCart: async () => {
        try {
          set({ isLoading: true });
          const response = await api.get('/cart');
          const cartData = response.data?.data;
          if (cartData) {
            set({
              items: cartData.items || [],
              cartId: cartData.cart_id || null,
              summary: cartData.summary || calculateSummary(cartData.items || []),
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          console.error('Load cart error:', error);
          set({ isLoading: false, error: 'Failed to load cart' });
        }
      },

      /**
       * Add item to cart with selected weight
       * weight = selected weight in kg (e.g., 0.5, 1, 2)
       */
      addToCart: async (product, quantity = 1, weight = 1) => {
        if (!product.id) {
          toast.error('Product ID is missing.');
          return { success: false };
        }

        if (isAuthenticated()) {
          try {
            const response = await api.post('/cart/add', {
              product_id: product.id,
              quantity,
              weight: weight || 1, // Weight in kg
            });
            if (response.data?.success) {
              await get().loadUserCart();
              toast.success('Item added to cart');
              return { success: true };
            }
          } catch (error) {
            const msg = error.response?.data?.message || 'Failed to add item to cart';
            toast.error(msg);
            return { success: false, message: msg };
          }
        } else {
          // Guest cart
          const cartItem = {
            id: `guest_${Date.now()}`,
            product_id: product.id,
            name: product.name,
            slug: product.slug,
            price_per_kg: product.price_per_kg || 0,
            discount: product.discount || 0,
            weight: weight || 1,
            quantity,
            primary_image: product.primary_image,
            category_name: product.category_name,
          };
          set((state) => {
            const existingIdx = state.items.findIndex(
              (i) => i.product_id === product.id && i.weight === weight
            );
            let newItems;
            if (existingIdx >= 0) {
              // Update quantity if same product + weight exists
              newItems = state.items.map((item, idx) =>
                idx === existingIdx ? { ...item, quantity: item.quantity + quantity } : item,
              );
            } else {
              newItems = [...state.items, cartItem];
            }
            return { items: newItems, summary: calculateSummary(newItems) };
          });
          toast.success('Item added to cart');
          return { success: true };
        }
        return { success: false };
      },

      /**
       * Update cart item weight or quantity
       * This will recalculate the price dynamically
       */
      updateItem: async (itemId, updates) => {
        try {
          if (isAuthenticated()) {
            await api.put(`/cart/items/${itemId}`, updates);
            await get().loadUserCart();
          } else {
            // Guest cart update
            set((state) => {
              const newItems = state.items.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item
              );
              return { items: newItems, summary: calculateSummary(newItems) };
            });
          }
          return { success: true };
        } catch (error) {
          toast.error('Failed to update cart item');
          return { success: false };
        }
      },

      removeItem: async (itemId) => {
        try {
          if (isAuthenticated()) {
            await api.delete(`/cart/items/${itemId}`);
            await get().loadUserCart();
          } else {
            set((state) => ({
              items: state.items.filter((i) => i.id !== itemId),
              summary: calculateSummary(state.items.filter((i) => i.id !== itemId)),
            }));
          }
          toast.success('Item removed from cart');
          return { success: true };
        } catch (error) {
          toast.error('Failed to remove item');
          return { success: false };
        }
      },

      clearCart: async () => {
        try {
          if (isAuthenticated()) {
            await api.delete('/cart');
            set({ items: [], summary: calculateSummary([]) });
          } else {
            set({ items: [], summary: calculateSummary([]) });
          }
          return { success: true };
        } catch (error) {
          console.error('Clear cart error:', error);
          return { success: false };
        }
      },

      initGuestCart: () => {
        set({ items: [], summary: calculateSummary([]) });
      },
    })
  )
);

export default useCartStore;
