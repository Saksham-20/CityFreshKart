import React from 'react';
import useCart from '../../hooks/useCart';
import { getImageUrl, getPlaceholderImage, IMAGE_DIMS } from '../../utils/imageUtils';
import QuantitySelector from '../ui/QuantitySelector';

const WEIGHT_STEP = 0.5;

const CartItem = ({ item }) => {
  const { updateItemQuantity, removeFromCart } = useCart();

  const handleIncrease = () => updateItemQuantity(item.id, parseFloat((item.quantity + WEIGHT_STEP).toFixed(2)));
  const handleDecrease = () => {
    const newQty = parseFloat((item.quantity - WEIGHT_STEP).toFixed(2));
    if (newQty <= 0) {
      removeFromCart(item.id);
    } else {
      updateItemQuantity(item.id, newQty);
    }
  };
  const handleRemove = () => removeFromCart(item.id);

  const pricePerKg = item.price_per_kg || 0;
  const discountedPricePerKg = item.discount
    ? pricePerKg * (1 - item.discount / 100)
    : pricePerKg;
  const lineTotal = (discountedPricePerKg * item.quantity).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex items-start gap-3 sm:gap-4 p-4 hover:bg-gray-50 transition-colors duration-150">
      {/* Image */}
      <div className="flex-shrink-0">
        <img
          src={getImageUrl(item.image_url)}
          alt={item.name}
          width={IMAGE_DIMS.cartLine.width}
          height={IMAGE_DIMS.cartLine.height}
          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-gray-100"
          loading="lazy"
          decoding="async"
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

        <p className="text-xs text-gray-500 mt-0.5">₹{pricePerKg}/kg{item.discount > 0 ? ` · ${item.discount}% off` : ''}</p>

        <div className="flex items-center justify-between mt-2 gap-2">
          <QuantitySelector
            quantity={item.quantity}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            size="sm"
          />
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold text-gray-900">₹{lineTotal}</div>
            <div className="text-[10px] text-gray-400">{item.quantity} kg</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
