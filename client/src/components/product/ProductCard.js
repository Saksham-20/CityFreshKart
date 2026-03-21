import React, { useMemo, useCallback, useState } from 'react';
import useCart from '../../hooks/useCart';
import { getImageUrl } from '../../utils/imageUtils';

const KG_OPTIONS = [0.5, 1, 1.5, 2];
const PIECE_OPTIONS = [1, 2, 3, 4];

const formatWeight = (w) => w < 1 ? `${w * 1000}g` : `${w}kg`;

const ProductCard = React.memo(({ product, className = '', highlightFlash = false }) => {
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
    <div
      id={productId ? `product-${productId}` : undefined}
      className={`group bg-surface-container-lowest rounded-3xl outline outline-1 outline-outline-variant/10 hover:shadow-editorial hover:-translate-y-0.5 transition-all duration-200 overflow-visible flex flex-col shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] ${highlightFlash ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface z-[1]' : ''} ${className}`}
    >

      {/* Image */}
      <div className="relative bg-surface-container-low overflow-hidden rounded-t-3xl" style={{ aspectRatio: '1 / 1' }}>
        <img
          src={getImageUrl(product.image_url)}
          alt={product.name}
          className="w-full h-full object-cover product-image-offset group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          decoding="async"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f0fdf4'/%3E%3Ctext x='50%25' y='45%25' font-size='48' text-anchor='middle' dominant-baseline='middle'%3E%F0%9F%A5%A6%3C/text%3E%3Ctext x='50%25' y='74%25' font-size='13' fill='%2386efac' text-anchor='middle' font-family='Arial'%3ENo Image%3C/text%3E%3C/svg%3E`;
          }}
        />
        {discountPercent > 0 && (
          <div className="absolute top-2 left-2 bg-tertiary text-on-tertiary text-[10px] font-extrabold px-2 py-1 rounded-full shadow-md">
            {discountPercent}% OFF
          </div>
        )}
        {!discountPercent && (
          <div className="absolute top-2 right-2 z-10">
            <span className="bg-primary-fixed text-on-primary-fixed-variant text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
              FRESH
            </span>
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-inverse-surface text-inverse-on-surface text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 px-2.5 pt-2.5 pb-3 gap-2">
        <h3 className="text-[13px] sm:text-sm font-headline font-bold text-on-surface leading-snug line-clamp-2 min-h-[2.6em]">{product.name}</h3>

        {/* Qty/Weight selector */}
        <div className="flex gap-1 flex-wrap">
          {weightOptions.map(w => (
            <button
              key={w}
              onClick={() => setSelectedQty(w)}
              className={`text-[10px] font-bold px-2 py-1 rounded-full transition-all duration-150 outline outline-1 ${
                selectedQty === w
                  ? 'bg-surface-container-lowest text-primary outline-primary/40 shadow-sm'
                  : 'text-on-surface-variant outline-outline-variant/20 bg-surface-container-low hover:outline-primary/25'
              }`}
            >
              {isPerPiece ? `${w} ${w === 1 ? 'pc' : 'pcs'}` : formatWeight(w)}
            </button>
          ))}
        </div>

        {/* Price row */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm sm:text-base font-black text-primary">₹{effectivePrice.toFixed(0)}</span>
          {discountPercent > 0 && (
            <span className="text-[11px] text-on-surface-variant line-through">₹{originalPrice.toFixed(0)}</span>
          )}
          <span className="text-[10px] text-on-surface-variant ml-auto font-medium">{unitLabel}</span>
        </div>

        {/* Add to cart / quantity control */}
        {!outOfStock && (
          <div className="mt-auto">
            {!isInCart ? (
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary to-primary-container hover:opacity-95 active:scale-[0.97] text-on-primary text-xs font-bold py-2.5 rounded-2xl transition-all duration-150 shadow-primary-glow"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                Add to Cart
              </button>
            ) : (
              <div className="flex items-center justify-between bg-gradient-to-r from-primary to-primary-container rounded-2xl overflow-hidden shadow-primary-glow">
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
