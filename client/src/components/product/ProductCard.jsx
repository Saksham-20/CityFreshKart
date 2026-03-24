import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { calculatePriceWithOverrides } from '@/utils/weightSystem';
import WeightSelector from '../ui/WeightSelector';
import Button from '../ui/Button';
import { useCartStore } from '../../store/useCartStore';
import { IMAGE_DIMS } from '../../utils/imageUtils';

/**
 * ProductCard Component
 * Modern, minimal card for displaying products with weight selection
 */
const ProductCard = ({
  product,
  onAddToCart,
  isInCart = false,
  cartQuantity = 0,
  onUpdateQuantity,
}) => {
  const [selectedWeight, setSelectedWeight] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const cartItems = useCartStore(state => state.items);
  const addToCart = useCartStore(state => state.addToCart);
  const updateItemQuantity = useCartStore(state => state.updateItemQuantity);

  const pricing = calculatePriceWithOverrides(
    product.price_per_kg,
    selectedWeight,
    product.discount || 0,
    product.weight_price_overrides || {}
  );

  const imageSrc = product.image_url || product.image;
  const stockValue = product.quantity_available ?? product.stock_quantity ?? product.stock;
  const inStock = typeof stockValue === 'number' ? stockValue > 0 : !!stockValue;
  const cartItem = cartItems.find(item => item.id === product.id);
  const safeIsInCart = typeof onAddToCart === 'function' ? isInCart : Boolean(cartItem);
  const safeCartQuantity = typeof onAddToCart === 'function' ? cartQuantity : (cartItem?.quantity || 0);

  const handleAddClick = () => {
    if (typeof onAddToCart !== 'function') {
      addToCart(product, selectedWeight);
      return;
    }
    onAddToCart({
      id: product.id,
      name: product.name,
      pricePerKg: product.price_per_kg,
      weight: selectedWeight,
      price: pricing.finalPrice,
      image: imageSrc,
      discount: product.discount,
    });
  };

  const handleQuantityChange = (nextQty) => {
    if (typeof onUpdateQuantity === 'function') {
      onUpdateQuantity(product.id, nextQty);
      return;
    }
    updateItemQuantity(product.id, nextQty);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'bg-white rounded-2xl overflow-hidden',
        'border border-gray-200 hover:border-gray-300',
        'shadow-sm hover:shadow-md transition-all duration-300',
        'flex flex-col h-full'
      )}
      data-testid="product-card"
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden group">
        <img
          src={imageSrc}
          alt={product.name}
          width={IMAGE_DIMS.productSquare.width}
          height={IMAGE_DIMS.productSquare.height}
          className={cn(
            'w-full h-full object-cover',
            'transition-transform duration-500',
            'group-hover:scale-110'
          )}
          loading="lazy"
          decoding="async"
        />

        {/* Discount Badge */}
        {product.discount > 0 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white px-2.5 py-1 rounded-lg" data-testid="discount-badge">
            <span className="text-xs font-bold" data-testid="discount-amount">
              Save ₹{Math.round(product.discount)}
            </span>
          </div>
        )}

        {/* Stock Info */}
        {inStock && (
          <div className="absolute bottom-3 left-3 bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            In Stock
          </div>
        )}
      </div>

      {/* Product Info Section */}
      <div className="flex-1 p-4 flex flex-col">
        {/* Product Category */}
        <div className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1.5">
          {product.category_name || 'Fresh Produce'}
        </div>

        {/* Product Name */}
        <h3 className="text-sm font-semibold text-gray-900 mb-1.5 line-clamp-2 leading-snug">
          {product.name}
        </h3>

        {/* Rating & Reviews */}
        {product.rating && (
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'w-3.5 h-3.5',
                    i < Math.floor(product.rating)
                      ? 'text-yellow-400'
                      : 'text-gray-200'
                  )}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-xs text-gray-500">
              ({product.reviews || 0})
            </span>
          </div>
        )}

        {/* Price Per Kg */}
        <div className="mb-4">
          <span className="text-xs text-gray-600">Price per kg</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-gray-900" data-testid="product-price">
              ₹{product.price_per_kg}
            </span>
            {product.discount > 0 && (
              <span className="text-xs text-gray-400 line-through" data-testid="original-price">
                ₹{Math.round(product.price_per_kg + product.discount / 1)}
              </span>
            )}
          </div>
        </div>

        {/* Weight Selector - Collapsible on mobile */}
        {isExpanded && (
          <div className="mb-4 pb-4 border-t border-gray-200 pt-4" data-testid="weight-selector">
            <WeightSelector
              weight={selectedWeight}
              onWeightChange={setSelectedWeight}
              pricePerKg={product.price_per_kg}
              discount={product.discount}
              weightPriceOverrides={product.weight_price_overrides || {}}
            />
          </div>
        )}

        {/* Quick Summary */}
        {!isExpanded && (
          <div
            onClick={() => setIsExpanded(true)}
            className="cursor-pointer mb-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-600">Selected:</div>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedWeight} kg
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-600">Total:</div>
                <div className="text-lg font-bold text-green-600" data-testid="calculated-price">
                  ₹{Math.round(pricing.finalPrice)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        <div className="mt-auto pt-2">
          {!safeIsInCart ? (
            <Button
              onClick={handleAddClick}
              className="w-full"
              variant="default"
              data-testid="add-to-cart-btn"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          ) : (
            <div className="flex items-center gap-2 bg-green-50 rounded-lg p-1.5">
              <Button
                onClick={() => handleQuantityChange(safeCartQuantity - 1)}
                size="sm"
                variant="ghost"
                className="flex-1"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="flex-1 text-center text-sm font-semibold text-green-600" data-testid="cart-quantity">
                {safeCartQuantity}
              </span>
              <Button
                onClick={() => handleQuantityChange(safeCartQuantity + 1)}
                size="sm"
                variant="ghost"
                className="flex-1"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
