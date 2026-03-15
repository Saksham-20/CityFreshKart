import React from 'react';
import { useCart } from '../../context/CartContext';
import { getImageUrl, getPlaceholderImage } from '../../utils/imageUtils';
import QuantitySelector from '../ui/QuantitySelector';

const CartItem = ({ item }) => {
  const { updateItemQuantity, removeFromCart } = useCart();

  const handleIncrease = () => updateItemQuantity(item.id, item.quantity + 1);
  const handleDecrease = () => {
    if (item.quantity <= 1) {
      removeFromCart(item.id);
    } else {
      updateItemQuantity(item.id, item.quantity - 1);
    }
  };
  const handleRemove = () => removeFromCart(item.id);

  const lineTotal = (item.price * item.quantity).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <div className="flex items-start gap-3 sm:gap-4 p-4 hover:bg-gray-50 transition-colors duration-150">
      {/* Image */}
      <div className="flex-shrink-0">
        <img
          src={getImageUrl(item.primary_image)}
          alt={item.name}
          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-gray-100"
          onError={(e) => { e.target.src = getPlaceholderImage(); }}
        />
      </div>

      {/* Name + Qty + Price */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
            {item.name}
          </h3>
          <button
            onClick={handleRemove}
            aria-label="Remove item"
            className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors duration-150 p-0.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {item.variant && (
          <p className="text-xs text-gray-500 mt-0.5">{item.variant}</p>
        )}

        <div className="flex items-center justify-between mt-2 gap-2">
          <QuantitySelector
            quantity={item.quantity}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            size="sm"
          />

          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold text-gray-900">₹{lineTotal}</div>
            <div className="text-[10px] text-gray-400">
              ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} each
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
