import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Product Store - Manages product state globally
 * Includes filtering, sorting, and product details
 */
export const useProductStore = create(
  devtools(
    persist(
      (set) => ({
        products: [],
        selectedProduct: null,
        filters: {
          category: null,
          priceMin: 0,
          priceMax: 1000,
          searchTerm: '',
          sortBy: 'featured', // 'featured', 'price_asc', 'price_desc', 'name'
        },

        // Actions
        setProducts: (products) => set({ products }),
        selectProduct: (product) => set({ selectedProduct: product }),
        clearSelectedProduct: () => set({ selectedProduct: null }),

        setFilter: (filterKey, value) =>
          set((state) => ({
            filters: {
              ...state.filters,
              [filterKey]: value,
            },
          })),

        resetFilters: () =>
          set({
            filters: {
              category: null,
              priceMin: 0,
              priceMax: 1000,
              searchTerm: '',
              sortBy: 'featured',
            },
          }),

        // Computed getters
        getFilteredProducts: (state) => {
          const { products, filters } = state;
          return products.filter((product) => {
            const matchesSearch =
              !filters.searchTerm ||
              product.name.toLowerCase().includes(filters.searchTerm.toLowerCase());

            const matchesCategory =
              !filters.category || product.category_name === filters.category;

            const matchesPrice =
              product.price_per_kg >= filters.priceMin &&
              product.price_per_kg <= filters.priceMax;

            return matchesSearch && matchesCategory && matchesPrice;
          });
        },

        getSortedProducts: (state) => {
          const filtered = state.getFilteredProducts(state);
          const sorted = [...filtered];

          switch (state.filters.sortBy) {
            case 'price_asc':
              return sorted.sort((a, b) => a.price_per_kg - b.price_per_kg);
            case 'price_desc':
              return sorted.sort((a, b) => b.price_per_kg - a.price_per_kg);
            case 'name':
              return sorted.sort((a, b) => a.name.localeCompare(b.name));
            case 'featured':
            default:
              return sorted.sort((a, b) => (b.featured ? 1 : -1));
          }
        },
      }),
      {
        name: 'product-store',
        partialize: (state) => ({
          filters: state.filters,
        }),
      }
    )
  )
);
