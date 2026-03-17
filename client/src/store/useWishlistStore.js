import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const isAuthenticated = () => {
  try {
    const authStorage = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    return authStorage?.state?.isAuthenticated || false;
  } catch {
    return false;
  }
};

export const useWishlistStore = create(
  devtools((set, get) => ({
    items: [],
    isLoading: false,
    error: null,

    loadUserWishlist: async () => {
      try {
        set({ isLoading: true });
        const response = await api.get('/wishlist');
        const data = response.data?.data;
        set({ items: data?.items || [], isLoading: false, error: null });
      } catch (error) {
        console.error('Load wishlist error:', error);
        set({ isLoading: false, error: 'Failed to load wishlist' });
      }
    },

    addToWishlist: async (product) => {
      if (isAuthenticated()) {
        try {
          const response = await api.post('/wishlist', { product_id: product.id });
          if (response.data?.success) {
            await get().loadUserWishlist();
            toast.success('Added to wishlist');
            return { success: true };
          }
        } catch (error) {
          const msg = error.response?.data?.message || 'Failed to add to wishlist';
          toast.error(msg);
          return { success: false, message: msg };
        }
      } else {
        const exists = get().items.some((i) => i.product_id === product.id);
        if (!exists) {
          const item = {
            id: `guest_${Date.now()}`,
            product_id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            price_per_kg: product.price_per_kg,
            primary_image: product.primary_image,
          };
          set((state) => ({ items: [...state.items, item] }));
          // Persist guest wishlist
          try {
            localStorage.setItem('guestWishlist', JSON.stringify({ items: [...get().items] }));
          } catch {}
          toast.success('Added to wishlist');
        }
        return { success: true };
      }
      return { success: false };
    },

    removeFromWishlist: async (productId) => {
      if (isAuthenticated()) {
        try {
          await api.delete(`/wishlist/${productId}`);
          await get().loadUserWishlist();
          toast.success('Removed from wishlist');
          return { success: true };
        } catch (error) {
          toast.error('Failed to remove from wishlist');
          return { success: false };
        }
      } else {
        set((state) => {
          const newItems = state.items.filter((i) => i.product_id !== productId && i.id !== productId);
          try { localStorage.setItem('guestWishlist', JSON.stringify({ items: newItems })); } catch {}
          return { items: newItems };
        });
        toast.success('Removed from wishlist');
        return { success: true };
      }
    },

    isInWishlist: (productId) => get().items.some((i) => i.product_id === productId),

    clearWishlist: () => {
      set({ items: [] });
      localStorage.removeItem('guestWishlist');
    },

    initGuestWishlist: () => {
      if (!isAuthenticated()) {
        try {
          const saved = localStorage.getItem('guestWishlist');
          if (saved) {
            const parsed = JSON.parse(saved);
            set({ items: parsed.items || [] });
          }
        } catch {
          localStorage.removeItem('guestWishlist');
        }
      }
    },
  })),
);

export default useWishlistStore;
