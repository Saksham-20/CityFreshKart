import React, { useMemo, useCallback, useState } from 'react';
import useCart from '../../hooks/useCart';
import { getImageUrl } from '../../utils/imageUtils';

const WEIGHT_OPTIONS = [0.5, 1, 1.5, 2];

const ProductCard = React.memo(({ product, className = '' }) => {
  const { addToCart, removeFromCart, items: cartItems, updateItemQuantity } = useCart();
  const [selectedWeight, setSelectedWeight] = useState(0.5);

  const pricePerKg = useMemo(() => Number(product.price_per_kg || product.pricePerKg || product.price) || 0, [product]);
  const discountPercent = useMemo(() => Number(product.discount) || 0, [product.discount]);
  const effectivePrice = useMemo(() => {
    const base = pricePerKg * selectedWeight;
    return discountPercent > 0 ? base * (1 - discountPercent / 100) : base;
  }, [pricePerKg, selectedWeight, discountPercent]);
  const originalPrice = useMemo(() => pricePerKg * selectedWeight, [pricePerKg, selectedWeight]);

  const productId = product.product_id || product.id;
  const cartItem = useMemo(() => cartItems?.find(i => (i.product_id || i.id) === productId), [cartItems, productId]);
  const isInCart = !!cartItem;
  const cartQty = cartItem?.quantity || 0;
  const outOfStock = (product.quantity_available !== undefined && parseFloat(product.quantity_available) <= 0) ||
                     (product.stock_quantity !== undefined && product.stock_quantity <= 0);

  const handleAddToCart = useCallback(() => {
    addToCart({
      id: productId,
      name: product.name,
      price_per_kg: pricePerKg,
      discount: discountPercent,
      image_url: product.image_url,
    }, selectedWeight);
  }, [addToCart, product, productId, pricePerKg, selectedWeight, discountPercent]);

  const handleIncrease = useCallback(() => {
    if (cartItem) updateItemQuantity(cartItem.id, parseFloat((cartQty + selectedWeight).toFixed(2)));
  }, [cartItem, cartQty, selectedWeight, updateItemQuantity]);

  const handleDecrease = useCallback(() => {
    if (!cartItem) return;
    const newQty = parseFloat((cartQty - selectedWeight).toFixed(2));
    if (newQty <= 0) removeFromCart(cartItem.id);
    else updateItemQuantity(cartItem.id, newQty);
  }, [cartItem, cartQty, selectedWeight, removeFromCart, updateItemQuantity]);

  if (!product) return null;

  return (
    <div className={`group bg-white rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col ${className}`}>
      
      {/* Image container */}
      <div className="relative bg-gray-50 overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
        <img
          src={getImageUrl(product.image_url)}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='45%25' font-size='40' text-anchor='middle' dominant-baseline='middle'%3E%F0%9F%A5%A6%3C/text%3E%3Ctext x='50%25' y='72%25' font-size='13' fill='%239ca3af' text-anchor='middle' font-family='Arial'%3ENo Image%3C/text%3E%3C/svg%3E`;
          }}
        />

        {/* Discount badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shadow">
            {discountPercent}% OFF
          </div>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-gray-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 px-2.5 pt-2 pb-2.5 gap-1.5">
        {/* Name */}
        <h3 className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.5em]">
          {product.name}
        </h3>

        {/* Weight selector */}
        <div className="flex gap-1 flex-wrap">
          {WEIGHT_OPTIONS.map(w => (
            <button
              key={w}
              onClick={() => setSelectedWeight(w)}
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                selectedWeight === w
                  ? 'bg-green-600 text-white border-green-600'
                  : 'text-gray-500 border-gray-200 hover:border-green-400 hover:text-green-700'
              }`}
            >
              {w}kg
            </button>
          ))}
        </div>

        {/* Price row */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-extrabold text-gray-900">₹{effectivePrice.toFixed(0)}</span>
          {discountPercent > 0 && (
            <span className="text-[11px] text-gray-400 line-through">₹{originalPrice.toFixed(0)}</span>
          )}
          <span className="text-[10px] text-gray-400 ml-auto">/ {selectedWeight}kg</span>
        </div>

        {/* Add to cart / quantity control */}
        {!outOfStock && (
          <div className="mt-auto pt-1">
            {!isInCart ? (
              <button
                onClick={handleAddToCart}
                className="w-full flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-xs font-bold py-2 rounded-xl transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            ) : (
              <div className="flex items-center justify-between bg-green-600 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={handleDecrease}
                  className="w-9 h-8 flex items-center justify-center text-white hover:bg-green-700 active:bg-green-800 transition-colors text-base font-bold"
                >
                  −
                </button>
                <span className="text-white text-xs font-extrabold flex-1 text-center">
                  {cartQty % 1 === 0 ? cartQty : cartQty.toFixed(1)} kg
                </span>
                <button
                  onClick={handleIncrease}
                  className="w-9 h-8 flex items-center justify-center text-white hover:bg-green-700 active:bg-green-800 transition-colors text-base font-bold"
                >
                  +
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
export default ProductCard;
