import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { getPublicApiOrigin } from '../utils/publicOrigin';

const CartContext = createContext();

// Action types
const CART_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_CART: 'SET_CART',
  ADD_ITEM: 'ADD_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  CLEAR_CART: 'CLEAR_CART',
  SET_ERROR: 'SET_ERROR',
  MERGE_GUEST_CART: 'MERGE_GUEST_CART',
  UPDATE_WEIGHT: 'UPDATE_WEIGHT'
};

// Initial state
const initialState = {
  items: [],
  cartId: null,
  summary: {
    item_count: 0,
    subtotal: 0,
    delivery_fee: 0,
    estimated_total: 0
  },
  isLoading: false,
  error: null
};

// Reducer function
const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case CART_ACTIONS.SET_CART:
      return {
        ...state,
        items: action.payload.items || [],
        cartId: action.payload.cart_id || null,
        summary: action.payload.summary || {
          item_count: 0,
          subtotal: 0,
          estimated_tax: 0,
          estimated_total: 0
        },
        isLoading: false,
        error: null
      };

    case CART_ACTIONS.ADD_ITEM:
      const existingItemIndex = state.items.findIndex(
        item => item.product_id === action.payload.product_id
      );

      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedItems = [...state.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: action.payload.quantity
        };

        return {
          ...state,
          items: updatedItems,
          summary: calculateSummary(updatedItems)
        };
      } else {
        // Add new item
        const newItems = [...state.items, action.payload];
        return {
          ...state,
          items: newItems,
          summary: calculateSummary(newItems)
        };
      }

    case CART_ACTIONS.UPDATE_ITEM:
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );

      return {
        ...state,
        items: updatedItems,
        summary: calculateSummary(updatedItems)
      };

    case CART_ACTIONS.REMOVE_ITEM:
      const filteredItems = state.items.filter(
        item => item.id !== action.payload
      );

      return {
        ...state,
        items: filteredItems,
        summary: calculateSummary(filteredItems)
      };

    case CART_ACTIONS.CLEAR_CART:
      return {
        ...state,
        items: [],
        summary: {
          item_count: 0,
          subtotal: 0,
          delivery_fee: 0,
          estimated_total: 0
        }
      };

    case CART_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case CART_ACTIONS.MERGE_GUEST_CART:
      return {
        ...state,
        items: action.payload.items,
        summary: action.payload.summary
      };

    case CART_ACTIONS.UPDATE_WEIGHT:
      const itemsWithNewWeight = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, weight: action.payload.weight }
          : item
      );

      return {
        ...state,
        items: itemsWithNewWeight,
        summary: calculateSummary(itemsWithNewWeight)
      };

    default:
      return state;
  }
};

// Helper function to calculate cart summary with delivery fees
const calculateSummary = (items) => {
  // Calculate subtotal with weight support
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.price_per_kg ? item.price_per_kg * (item.weight || 1) * (item.quantity || 1) : (item.price || 0) * (item.quantity || 1);
    return sum + itemPrice;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  
  // Calculate delivery fee: FREE above ₹300, else ₹40
  const deliveryFee = subtotal >= 300 ? 0 : 40;
  
  const estimatedTotal = subtotal + deliveryFee;

  return {
    item_count: itemCount,
    subtotal: parseFloat(subtotal.toFixed(2)),
    delivery_fee: deliveryFee,
    estimated_total: parseFloat(estimatedTotal.toFixed(2))
  };
};

// Cart Provider Component
export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { isAuthenticated, token } = useAuth();

  // Load cart from localStorage for guest users
  useEffect(() => {
    if (!isAuthenticated) {
      const guestCart = localStorage.getItem('guestCart');
      if (guestCart) {
        try {
          const parsedCart = JSON.parse(guestCart);
          dispatch({
            type: CART_ACTIONS.MERGE_GUEST_CART,
            payload: parsedCart
          });
        } catch (error) {
          console.error('Error parsing guest cart:', error);
          localStorage.removeItem('guestCart');
        }
      }
    }
  }, [isAuthenticated]);

  // Save guest cart to localStorage
  useEffect(() => {
    if (!isAuthenticated && state.items.length > 0) {
      localStorage.setItem('guestCart', JSON.stringify({
        items: state.items,
        summary: state.summary
      }));
    } else if (!isAuthenticated && state.items.length === 0) {
      localStorage.removeItem('guestCart');
    }
  }, [state.items, state.summary, isAuthenticated]);

  // Load user cart when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadUserCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  // Load user cart from API
  const loadUserCart = async () => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });

      const response = await api.get('/cart', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data) {
        // Cart data loaded successfully
        dispatch({
          type: CART_ACTIONS.SET_CART,
          payload: response.data.data
        });
      } else {
        throw new Error('Failed to load cart');
      }
    } catch (error) {
      console.error('Load cart error:', error);
      dispatch({
        type: CART_ACTIONS.SET_ERROR,
        payload: 'Failed to load cart'
      });
    }
  };

  // Add item to cart
  const addToCart = async (product, quantity = 1, variantDetails = null) => {
    try {
      // Adding product to cart
      console.log('Add to cart - Product data:', product);
      console.log('Add to cart - Product ID:', product.id);
      
      if (!product.id) {
        console.error('Product ID is missing:', product);
        toast.error('Product ID is missing. Cannot add to cart.');
        return { success: false, message: 'Product ID is missing' };
      }
      
      if (isAuthenticated) {
        // Add to user cart via API
        const requestData = {
          product_id: product.id,
          quantity,
          variant_details: variantDetails
        };
        
        const response = await api.post('/cart/add', requestData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data) {
          // Reload cart to get updated state
          await loadUserCart();
          
          toast.success(response.data.message || 'Item added to cart');
          return { success: true };
        } else {
          // Handle error response
          
          if (response.status === 404) {
            toast.error('This product is no longer available');
          } else {
            toast.error(response.data?.message || 'Failed to add item to cart');
          }
          return { success: false, message: response.data?.message };
        }
      } else {
        // Add to guest cart
        const cartItem = {
          id: `guest_${Date.now()}`,
          product_id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          compare_price: product.compare_price,
          sku: product.sku,
          quantity,
          variant_details: variantDetails,
          primary_image: product.primary_image,
          category_name: product.category_name,
          category_slug: product.category_slug
        };

        dispatch({
          type: CART_ACTIONS.ADD_ITEM,
          payload: cartItem
        });

        toast.success('Item added to cart');
        return { success: true };
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error('Failed to add item to cart');
      return { success: false, message: 'Network error' };
    }
  };

  // Update cart item quantity
  const updateItemQuantity = async (itemId, quantity) => {
    try {
      if (isAuthenticated) {
        // Update via API
        const response = await api.put(`/cart/${itemId}`, { quantity }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data) {
          // Reload cart to get updated state
          await loadUserCart();
          
          toast.success(response.data.message || 'Cart updated');
          return { success: true };
        } else {
          toast.error(response.data?.message || 'Failed to update cart');
          return { success: false, message: response.data?.message };
        }
      } else {
        // Update guest cart
        dispatch({
          type: CART_ACTIONS.UPDATE_ITEM,
          payload: { id: itemId, quantity }
        });

        toast.success('Cart updated');
        return { success: true };
      }
    } catch (error) {
      console.error('Update cart error:', error);
      toast.error('Failed to update cart');
      return { success: false, message: 'Network error' };
    }
  };

  // Remove item from cart
  const removeFromCart = async (itemId) => {
    try {
      // Removing item from cart
      
      if (isAuthenticated) {
        // Check if itemId is a product ID or cart item ID
        // If it's a product ID, find the corresponding cart item ID
        let cartItemId = itemId;
        
        // Check if this is a product ID by looking in the current cart items
        const cartItem = state.items.find(item => item.product_id === itemId);
        if (cartItem) {
          cartItemId = cartItem.id;
        }
        
        // Remove via API
        const apiUrl = getPublicApiOrigin();
        const url = `${apiUrl}/api/cart/${cartItemId}`;
        
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          // Reload cart to get updated state
          await loadUserCart();
          
          toast.success(data.message || 'Item removed from cart');
          return { success: true };
        } else {
          const errorData = await response.json();
          toast.error(errorData.message || 'Failed to remove item');
          return { success: false, message: errorData.message };
        }
      } else {
        // Remove from guest cart
        // Check if itemId is a product ID or cart item ID
        let cartItemId = itemId;
        
        // Check if this is a product ID by looking in the current cart items
        const cartItem = state.items.find(item => item.product_id === itemId);
        if (cartItem) {
          cartItemId = cartItem.id;
        }
        
        dispatch({
          type: CART_ACTIONS.REMOVE_ITEM,
          payload: cartItemId
        });

        toast.success('Item removed from cart');
        return { success: true };
      }
    } catch (error) {
      console.error('Remove from cart error:', error);
      toast.error('Failed to remove item from cart');
      return { success: false, message: 'Network error' };
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      if (isAuthenticated) {
        // Clear via API
        const response = await api.delete('/cart', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data) {
          // Reload cart to get updated state
          await loadUserCart();
          
          toast.success(response.data.message || 'Cart cleared');
          return { success: true };
        } else {
          toast.error(response.data?.message || 'Failed to clear cart');
          return { success: false, message: response.data?.message };
        }
      } else {
        // Clear guest cart
        dispatch({ type: CART_ACTIONS.CLEAR_CART });
        toast.success('Cart cleared');
        return { success: true };
      }
    } catch (error) {
      console.error('Clear cart error:', error);
      toast.error('Failed to clear cart');
      return { success: false, message: 'Network error' };
    }
  };

  // Merge guest cart with user cart after login
  const mergeGuestCart = async () => {
    if (state.items.length === 0) return;

    try {
      const guestItems = state.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        variant_details: item.variant_details
      }));

      const apiUrl = getPublicApiOrigin();
      const response = await fetch(`${apiUrl}/api/cart/merge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ guest_items: guestItems })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Clear guest cart and load user cart
        dispatch({ type: CART_ACTIONS.CLEAR_CART });
        localStorage.removeItem('guestCart');
        
        // Reload user cart
        await loadUserCart();
        
        toast.success(data.message || 'Guest cart merged successfully');
        return { success: true };
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to merge cart');
        return { success: false, message: errorData.message };
      }
    } catch (error) {
      console.error('Merge cart error:', error);
      toast.error('Failed to merge cart');
      return { success: false, message: 'Network error' };
    }
  };

  // Get cart item count
  const getCartItemCount = () => {
    return state.summary.item_count;
  };

  // Check if item is in cart
  const isItemInCart = (productId) => {
    return state.items.some(item => item.product_id === productId);
  };

  // Get cart item by product ID
  const getCartItem = (productId) => {
    return state.items.find(item => item.product_id === productId);
  };

  // Update cart item weight (for weight-based pricing)
  const updateItemWeight = async (itemId, weight) => {
    try {
      if (isAuthenticated) {
        // Update weight via API (if you implement this endpoint)
        const response = await api.put(`/cart/${itemId}`, { weight }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data) {
          await loadUserCart();
          toast.success('Weight updated');
          return { success: true };
        } else {
          toast.error(response.data?.message || 'Failed to update weight');
          return { success: false };
        }
      } else {
        // Update weight in guest cart
        dispatch({
          type: CART_ACTIONS.UPDATE_WEIGHT,
          payload: { id: itemId, weight }
        });

        toast.success('Weight updated');
        return { success: true };
      }
    } catch (error) {
      console.error('Update weight error:', error);
      toast.error('Failed to update weight');
      return { success: false };
    }
  };

  const value = {
    ...state,
    addToCart,
    updateItemQuantity,
    removeFromCart,
    clearCart,
    mergeGuestCart,
    getCartItemCount,
    isItemInCart,
    getCartItem,
    loadUserCart,
    updateItemWeight
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
