import { useCartStore } from '../store/useCartStore';

const useCart = () => {
  const {
    items,
    addToCart,
    adjustPackCount,
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
    adjustPackCount,
    updateItemQuantity,
    removeFromCart,
    clearCart,
    isItemInCart,
    getCartItemCount,
    calculateSummary,
  };
};

export { useCart };
export default useCart;
