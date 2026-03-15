import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import useCart from '../../hooks/useCart';
import useWishlist from '../../hooks/useWishlist';
import { formatCurrency as formatPrice } from '../../utils/formatters';
import { getImageUrl, getPlaceholderImage } from '../../utils/imageUtils';
import QuantitySelector from '../ui/QuantitySelector';

const ProductCard = React.memo(({ product, className = '' }) => {
  const { addToCart, isItemInCart, removeFromCart, items: cartItems, updateItemQuantity } = useCart();
  const { addToWishlist, removeFromWishlist, isItemInWishlist } = useWishlist();

  const formattedPrice = useMemo(() => formatPrice(product.price), [product.price]);
  const formattedComparePrice = useMemo(() =>
    product.comparePrice ? formatPrice(product.comparePrice) : null,
    [product.comparePrice]
  );

  const discountPercentage = useMemo(() => {
    if (!product.comparePrice || product.comparePrice <= product.price) return 0;
    return Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100);
  }, [product.price, product.comparePrice]);

  const productId = product.product_id || product.id;

  const isInCartState = useMemo(() => isItemInCart(productId), [isItemInCart, productId]);
  const isInWishlistState = useMemo(() => isItemInWishlist(productId), [isItemInWishlist, productId]);

  // Get cart item to read quantity
  const cartItem = useMemo(
    () => cartItems?.find(i => (i.product_id || i.id) === productId),
    [cartItems, productId]
  );
  const cartQty = cartItem?.quantity || 1;

  const handleAddToCart = useCallback(() => {
    const cartProduct = {
      id: productId,
      name: product.name,
      slug: product.slug,
      price: product.price,
      compare_price: product.compare_price,
      sku: product.sku,
      primary_image: product.primary_image,
      category_name: product.category_name,
      category_slug: product.category_slug
    };
    addToCart(cartProduct);
  }, [addToCart, product, productId]);

  const handleIncrease = useCallback(() => {
    if (cartItem) {
      updateItemQuantity(cartItem.id, cartQty + 1);
    }
  }, [cartItem, cartQty, updateItemQuantity]);

  const handleDecrease = useCallback(() => {
    if (!cartItem) return;
    if (cartQty <= 1) {
      removeFromCart(cartItem.id);
    } else {
      updateItemQuantity(cartItem.id, cartQty - 1);
    }
  }, [cartItem, cartQty, removeFromCart, updateItemQuantity]);

  const handleToggleWishlist = useCallback(() => {
    if (isInWishlistState) {
      removeFromWishlist(productId);
    } else {
      addToWishlist(product);
    }
  }, [isInWishlistState, removeFromWishlist, addToWishlist, product, productId]);

  if (!product) return null;

  const outOfStock = product.stock_quantity !== undefined && product.stock_quantity <= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`group bg-white rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 overflow-hidden ${className}`}
    >
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <Link to={`/products/${product.slug || product.id}`} tabIndex={-1} aria-hidden="true">
          <img
            src={getImageUrl(product.primary_image)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => { e.target.src = getPlaceholderImage(); }}
          />
        </Link>

        {/* Discount Badge */}
        {discountPercentage > 0 && (
          <div className="absolute top-2 left-2 bg-saffron text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            -{discountPercentage}%
          </div>
        )}

        {/* Wishlist Button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleToggleWishlist}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-colors duration-200 ${
            isInWishlistState
              ? 'bg-red-50 text-red-500'
              : 'bg-white/90 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100'
          }`}
          aria-label={isInWishlistState ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg
            className="w-4 h-4"
            fill={isInWishlistState ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </motion.button>

        {/* Out of Stock Overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-gray-800 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3 sm:p-4">
        {/* Category */}
        {product.category_name && (
          <div className="text-[10px] text-fresh-green font-semibold uppercase tracking-wide mb-1">
            {product.category_name}
          </div>
        )}

        {/* Product Name */}
        <Link to={`/products/${product.slug || product.id}`}>
          <h3 className="text-sm font-semibold text-gray-800 mb-1.5 line-clamp-2 hover:text-fresh-green transition-colors duration-200 leading-snug">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {product.average_rating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-3 h-3 ${i < Math.floor(product.average_rating) ? 'text-yellow-400 fill-current' : 'text-gray-200 fill-current'}`}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-[10px] text-gray-400">({product.review_count || 0})</span>
          </div>
        )}

        {/* Price row + Cart CTA */}
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex flex-col">
            <span className="text-base font-bold text-gray-900 leading-tight">
              {formattedPrice}
            </span>
            {formattedComparePrice && (
              <span className="text-xs text-gray-400 line-through leading-tight">
                {formattedComparePrice}
              </span>
            )}
          </div>

          {/* Add to Cart / Quantity Selector */}
          {outOfStock ? (
            <button
              disabled
              className="text-xs text-gray-400 border border-gray-200 rounded-xl px-3 py-1.5 cursor-not-allowed"
            >
              Unavailable
            </button>
          ) : isInCartState ? (
            <QuantitySelector
              quantity={cartQty}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
              size="sm"
            />
          ) : (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleAddToCart}
              className="flex items-center gap-1 bg-fresh-green text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-fresh-green-dark transition-colors duration-200 shadow-sm"
              aria-label={`Add ${product.name} to cart`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
