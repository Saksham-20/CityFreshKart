import React, { useMemo, useCallback, useState } from 'react';
import useCart from '../../hooks/useCart';
import { getImageUrl } from '../../utils/imageUtils';

const KG_OPTIONS = [0.5, 1, 1.5, 2];
const PIECE_OPTIONS = [1, 2, 3, 4];

const formatWeight = (w) => w < 1 ? `${w * 1000}g` : `${w}kg`;

const ProductCard = React.memo(({ product, className = '' }) => {
  const { addToCart, removeFromCart, items: cartItems, updateItemQuantity } = useCart();

  const isPerPiece = product.pricing_type === 'per_piece';
  const weightOptions = isPerPiece ? PIECE_OPTIONS : KG_OPTIONS;

  const [selectedQty, setSelectedQty] = useState(weightOptions[0]);

  const pricePerUnit = useMemo(() => Number(product.price_per_kg || product.pricePerKg || product.price) || 0, [product]);
  const discountPercent = useMemo(() => Number(product.discount) || 0, [product.discount]);

  const effectivePrice = useMemo(() => {
    const base = pricePerUnit * selectedQty;
    return discountPercent > 0 ? base * (1 - discountPercent / 100) : base;
  }, [pricePerUnit, selectedQty, discountPercent]);

  const originalPrice = useMemo(() => pricePerUnit * selectedQty, [pricePerUnit, selectedQty]);

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
      price_per_kg: pricePerUnit,
      discount: discountPercent,
      image_url: product.image_url,
      pricing_type: product.pricing_type || 'per_kg',
    }, selectedQty);
  }, [addToCart, product, productId, pricePerUnit, selectedQty, discountPercent]);

  const handleIncrease = useCallback(() => {
    if (cartItem) updateItemQuantity(cartItem.id, parseFloat((cartQty + selectedQty).toFixed(2)));
  }, [cartItem, cartQty, selectedQty, updateItemQuantity]);

  const handleDecrease = useCallback(() => {
    if (!cartItem) return;
    const newQty = parseFloat((cartQty - selectedQty).toFixed(2));
    if (newQty <= 0) removeFromCart(cartItem.id);
    else updateItemQuantity(cartItem.id, newQty);
  }, [cartItem, cartQty, selectedQty, removeFromCart, updateItemQuantity]);

  const cartQtyLabel = isPerPiece
    ? `${cartQty} ${cartQty === 1 ? 'pc' : 'pcs'}`
    : `${cartQty % 1 === 0 ? cartQty : cartQty.toFixed(1)} kg`;

  const unitLabel = isPerPiece ? '/pc' : `/${formatWeight(selectedQty)}`;

  if (!product) return null;

  return (
    <div className={`group bg-white rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col ${className}`}>

      {/* Image */}
      <div className="relative bg-gray-50 overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
        <img
          src={getImageUrl(product.image_url)}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f0fdf4'/%3E%3Ctext x='50%25' y='45%25' font-size='48' text-anchor='middle' dominant-baseline='middle'%3E%F0%9F%A5%A6%3C/text%3E%3Ctext x='50%25' y='74%25' font-size='13' fill='%2386efac' text-anchor='middle' font-family='Arial'%3ENo Image%3C/text%3E%3C/svg%3E`;
          }}
        />
        {discountPercent > 0 && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-full shadow-md">
            {discountPercent}% OFF
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-gray-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 px-2.5 pt-2.5 pb-3 gap-2">
        <h3 className="text-sm font-bold text-gray-800 leading-snug line-clamp-2 min-h-[2.6em]">{product.name}</h3>

        {/* Qty/Weight selector */}
        <div className="flex gap-1 flex-wrap">
          {weightOptions.map(w => (
            <button
              key={w}
              onClick={() => setSelectedQty(w)}
              className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all duration-150 ${
                selectedQty === w
                  ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white border-transparent shadow-sm'
                  : 'text-gray-500 border-gray-200 bg-white hover:border-green-400 hover:text-green-700'
              }`}
            >
              {isPerPiece ? `${w} ${w === 1 ? 'pc' : 'pcs'}` : formatWeight(w)}
            </button>
          ))}
        </div>

        {/* Price row */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-black text-green-700">₹{effectivePrice.toFixed(0)}</span>
          {discountPercent > 0 && (
            <span className="text-[11px] text-gray-400 line-through">₹{originalPrice.toFixed(0)}</span>
          )}
          <span className="text-[10px] text-gray-400 ml-auto font-medium">{unitLabel}</span>
        </div>

        {/* Add to cart / quantity control */}
        {!outOfStock && (
          <div className="mt-auto">
            {!isInCart ? (
              <button onClick={handleAddToCart}
                className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 active:scale-[0.97] text-white text-xs font-bold py-2.5 rounded-xl transition-all duration-150 shadow-sm hover:shadow-md">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add to Cart
              </button>
            ) : (
              <div className="flex items-center justify-between bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl overflow-hidden shadow-sm">
                <button onClick={handleDecrease}
                  className="w-10 h-9 flex items-center justify-center text-white hover:bg-black/10 active:bg-black/20 transition-colors text-lg font-bold">−</button>
                <span className="text-white text-xs font-extrabold flex-1 text-center tracking-wide">{cartQtyLabel}</span>
                <button onClick={handleIncrease}
                  className="w-10 h-9 flex items-center justify-center text-white hover:bg-black/10 active:bg-black/20 transition-colors text-lg font-bold">+</button>
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
