import React, { useMemo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import useCart from '../../hooks/useCart';
import { formatCurrency as formatPrice } from '../../utils/formatters';
import { getImageUrl } from '../../utils/imageUtils';
import QuantitySelector from '../ui/QuantitySelector';

const WEIGHT_OPTIONS = [0.5, 1, 1.5, 2]; // Default weight options in kg

const ProductCard = React.memo(({ product, className = '' }) => {
  const { addToCart, isItemInCart, removeFromCart, items: cartItems, updateItemQuantity } = useCart();

  const isWeightBased = useMemo(() => product.price_per_kg || product.pricePerKg, [product]);
  
  // Price per kg for display
  const pricePerKg = useMemo(() => {
    const price = product.price_per_kg || product.pricePerKg || product.price;
    return Number(price) || 0;
  }, [product]);
  
  // Apply discount if exists
  const discountPercent = useMemo(() => product.discount || 0, [product.discount]);
  
  // Calculate total price based on weight and discount
  const totalPrice = useMemo(() => {
    let price = (pricePerKg || 0) * selectedWeight;
    if (discountPercent > 0) {
      price = price - (price * (discountPercent / 100));
    }
    return price;
  }, [pricePerKg, selectedWeight, discountPercent]);

  const formattedPrice = useMemo(() => formatPrice(pricePerKg), [pricePerKg]);

  const productId = product.product_id || product.id;

  const isInCartState = useMemo(() => isItemInCart(productId), [isItemInCart, productId]);

  // Get cart item to read quantity
  const cartItem = useMemo(
    () => cartItems?.find(i => (i.product_id || i.id) === productId),
    [cartItems, productId]
  );
  const isInCart = !!cartItem;
  const cartQty = cartItem?.quantity || 1;

  const handleAddToCart = useCallback(() => {
    const cartProduct = {
      id: productId,
      name: product.name,
      slug: product.slug,
      price: totalPrice,
      price_per_kg: pricePerKg,
      weight: selectedWeight,
      discount: discountPercent,
      primary_image: product.primary_image,
      category_name: product.category_name,
      category_slug: product.category_slug
    };
    addToCart(cartProduct, 1, selectedWeight);
  }, [addToCart, product, productId, totalPrice, pricePerKg, selectedWeight, discountPercent]);

  const handleIncrease = useCallback(() => {
    if (cartItem) {
      updateItem(cartItem.id, { quantity: cartQty + 1 });
    }
  }, [cartItem, cartQty, updateItem]);

  const handleDecrease = useCallback(() => {
    if (!cartItem) return;
    if (cartQty <= 1) {
      removeItem(cartItem.id);
    } else {
      updateItem(cartItem.id, { quantity: cartQty - 1 });
    }
  }, [cartItem, cartQty, removeFromCart, updateItemQuantity]);

  if (!product) return null;

  const outOfStock = product.stock_quantity !== undefined && product.stock_quantity <= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-fresh-green-200 ${className}`}
    >
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Link to={`/products/${product.slug || product.id}`} tabIndex={-1} aria-hidden="true" className="w-full h-full flex items-center justify-center">
          <img
            src={getImageUrl(product.image || product.primary_image)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        </Link>

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg animate-pulse">
            -{discountPercent}%
          </div>
        )}

        {/* Out of Stock Overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3.5 sm:p-4">
        {/* Category Badge */}
        {product.category_name && (
          <div className="text-[10px] text-fresh-green-600 font-bold uppercase tracking-wider mb-1.5 bg-fresh-green-50 inline-block px-2 py-0.5 rounded-full">
            {product.category_name}
          </div>
        )}

        {/* Product Name */}
        <Link to={`/products/${product.slug || product.id}`}>
          <h3 className="text-sm font-semibold text-gray-800 mb-2 line-clamp-2 hover:text-fresh-green-600 transition-colors duration-200 leading-snug">
            {product.name}
          </h3>
        </Link>

        {/* Price and Weight Selector for weight-based products */}
        {isWeightBased ? (
          <div className="space-y-3 mt-3">
            {/* Price per kg display */}
            <div className="flex items-baseline justify-between gap-2 pb-2 border-b border-gray-100">
              <span className="text-xs text-gray-600 font-semibold">₹{pricePerKg.toFixed(0)}<span className="text-gray-500">/kg</span></span>
              {discountPercent > 0 && (
                <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                  Save {discountPercent}%
                </span>
              )}
            </div>

            {/* Weight Selector */}
            <div className="flex items-center gap-2">
              <select
                value={selectedWeight}
                onChange={(e) => setSelectedWeight(parseFloat(e.target.value))}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fresh-green-500 focus:border-fresh-green-500 bg-white hover:border-fresh-green-400 transition-all duration-200"
              >
                {WEIGHT_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {w} kg
                  </option>
                ))}
              </select>
              <span className="text-sm font-bold text-gray-900 whitespace-nowrap text-fresh-green-600">
                ₹{totalPrice.toFixed(0)}
              </span>
            </div>

            {/* Add to Cart Button */}
            <div>
              {outOfStock ? (
                <button
                  disabled
                  className="w-full text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-2 cursor-not-allowed bg-gray-50 font-semibold"
                >
                  Out of Stock
                </button>
              ) : isInCart ? (
                <QuantitySelector
                  quantity={cartQty}
                  onIncrease={handleIncrease}
                  onDecrease={handleDecrease}
                  size="sm"
                  className="w-full"
                />
              ) : (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddToCart}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-fresh-green-500 to-fresh-green-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:from-fresh-green-600 hover:to-fresh-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  aria-label={`Add ${product.name} to cart`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </motion.button>
              )}
            </div>
          </div>
        ) : (
          /* Original price display for non-weight-based products */
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-100">
            <div className="flex flex-col">
              <span className="text-base font-bold text-fresh-green-600 leading-tight">
                {formattedPrice}
              </span>
            </div>

            {/* Add to Cart / Quantity Selector */}
            {outOfStock ? (
              <button
                disabled
                className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5 cursor-not-allowed bg-gray-50 font-semibold"
              >
                Unavailable
              </button>
            ) : isInCart ? (
              <QuantitySelector
                quantity={cartQty}
                onIncrease={handleIncrease}
                onDecrease={handleDecrease}
                size="sm"
              />
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleAddToCart}
                className="flex items-center gap-1.5 bg-gradient-to-r from-fresh-green-500 to-fresh-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:from-fresh-green-600 hover:to-fresh-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
                aria-label={`Add ${product.name} to cart`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
