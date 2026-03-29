import React from 'react';
import useCart from '../../hooks/useCart';
import { getImageUrl, getPlaceholderImage, IMAGE_DIMS } from '../../utils/imageUtils';
import {
  formatCartQuantityLabel,
  getCartLinePricing,
  getCartLineTotal,
  getTierWeightsFromOverrides,
} from '../../utils/weightSystem';
import QuantitySelector from '../ui/QuantitySelector';

const GRAM_STEP_KG = 0.05;
const PIECE_STEP = 1;
const MIN_KG = GRAM_STEP_KG;

const CartItem = ({ item }) => {
  const { updateItemQuantity, removeFromCart, adjustPackCount } = useCart();
  const lineKey = item.lineId || item.id;

  const tierOptions = item.pricing_type === 'per_piece'
    ? []
    : getTierWeightsFromOverrides(item.weight_price_overrides || {});

  const handleIncrease = () => {
    if (item.pricing_type !== 'per_piece' && tierOptions.length > 0) {
      adjustPackCount(lineKey, 1);
      return;
    }
    const step = item.pricing_type === 'per_piece' ? PIECE_STEP : GRAM_STEP_KG;
    updateItemQuantity(lineKey, parseFloat((item.quantity + step).toFixed(2)));
  };

  const handleDecrease = () => {
    if (item.pricing_type !== 'per_piece' && tierOptions.length > 0) {
      if ((item.packCount || 1) > 1) {
        adjustPackCount(lineKey, -1);
      } else {
        removeFromCart(lineKey);
      }
      return;
    }
    const step = item.pricing_type === 'per_piece' ? PIECE_STEP : GRAM_STEP_KG;
    const minQ = item.pricing_type === 'per_piece' ? PIECE_STEP : MIN_KG;
    const newQty = parseFloat((item.quantity - step).toFixed(2));
    if (newQty < minQ - 1e-6) {
      removeFromCart(lineKey);
    } else {
      updateItemQuantity(lineKey, newQty);
    }
  };

  const handleRemove = () => removeFromCart(lineKey);

  const pricePerKg = item.price_per_kg || 0;
  const pricing = getCartLinePricing(item);
  const lineTotal = getCartLineTotal(item).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const unitLabel = item.pricing_type === 'per_piece' ? '/pc' : '/kg';
  const priceMeta = pricing.hasTiers
    ? `₹${Number.isInteger(pricing.basePrice) ? pricing.basePrice : pricing.basePrice.toFixed(2)} for ${formatCartQuantityLabel(item)}`
    : `₹${pricePerKg}${unitLabel}`;
  const discountSuffix = item.discount > 0 ? ` · ${item.discount}% off` : '';

  return (
    <div className="flex items-start gap-3 sm:gap-4 p-4 hover:bg-gray-50 transition-colors duration-150">
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

        <p className="text-xs text-gray-500 mt-0.5">
          {priceMeta}{discountSuffix}
        </p>

        <div className="flex items-center justify-between mt-2 gap-2">
          <QuantitySelector
            quantity={item.quantity}
            displayLabel={formatCartQuantityLabel(item)}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            min={0}
            size="sm"
          />
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold text-gray-900">₹{lineTotal}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
