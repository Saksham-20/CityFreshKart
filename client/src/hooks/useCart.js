import { useCartStore } from '../store/useCartStore';

const useCart = () => {
  const {
    items,
    addToCart,
    updateItemQuantity,
    removeFromCart,
    clearCart,
    isItemInCart,
    getCartItemCount,
    calculateSummary,
  } = useCartStore();

  return {
    items,
    addToCart,
    updateItemQuantity,
    removeFromCart,
    clearCart,
    isItemInCart,
    getCartItemCount,
    calculateSummary,
  };
};

export default useCart;
