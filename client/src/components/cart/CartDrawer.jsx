import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { IMAGE_DIMS } from '../../utils/imageUtils';
import { calculateDelivery, FREE_DELIVERY_THRESHOLD } from '@/utils/weightSystem';
import Button from '../ui/Button';

/**
 * CartDrawer Component
 * Side drawer for displaying cart items instead of full page
 * Provides quick checkout access and item management
 */
const CartDrawer = ({
  isOpen,
  onClose,
  items = [],
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  subtotal = 0,
}) => {
  const drawerRef = useRef(null);
  
  const delivery = calculateDelivery(subtotal);
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const isFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={cn(
              'fixed inset-0 bg-black/40',
              'z-40 lg:hidden'
            )}
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={cn(
              'fixed right-0 top-0 bottom-0',
              'w-full sm:w-96 bg-white',
              'shadow-lg z-50',
              'flex flex-col'
            )}
            data-testid="cart-drawer"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Your Cart
                </h2>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  'p-2 hover:bg-gray-100 rounded-lg',
                  'transition-colors duration-200'
                )}
                aria-label="Close cart"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center px-4">
                  <div>
                    <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      Your cart is empty
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'flex gap-3 p-3 rounded-lg',
                        'border border-gray-200 hover:border-gray-300',
                        'transition-colors duration-200'
                      )}
                    >
                      {/* Item Image */}
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          width={IMAGE_DIMS.cartDrawer.width}
                          height={IMAGE_DIMS.cartDrawer.height}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          loading="lazy"
                          decoding="async"
                        />
                      )}

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                          {item.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.weight || '1'}kg × {item.quantity || 1}
                        </p>
                        <p className="text-sm font-bold text-green-600 mt-1">
                          ₹{Math.round(
                            (item.price || 0) * (item.quantity || 1)
                          )}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className={cn(
                          'p-2 hover:bg-red-50 rounded-lg',
                          'transition-colors duration-200',
                          'text-red-500 hover:text-red-600'
                        )}
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary & Checkout */}
            {items.length > 0 && (
              <div className="border-t border-gray-200 p-4 space-y-4">
                {/* Delivery Status */}
                <div className={cn(
                  'p-3 rounded-lg text-sm',
                  isFreeDelivery
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : subtotal > 0
                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    : 'bg-gray-50 text-gray-700 border border-gray-200'
                )}>
                  {isFreeDelivery ? (
                    <span className="font-medium">
                      ✓ Free delivery on this order!
                    </span>
                  ) : (
                    <span>
                      <strong>Free delivery</strong> on orders above ₹300
                    </span>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({itemCount} items)</span>
                    <span>₹{Math.round(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className={isFreeDelivery ? 'text-green-600 font-medium' : ''}>
                      {isFreeDelivery ? 'FREE' : `₹${delivery.deliveryFee}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
                    <span>Total</span>
                    <span className="text-green-600">
                      ₹{Math.round(delivery.total)}
                    </span>
                  </div>
                </div>

                {/* Checkout Button */}
                <Button
                  onClick={onCheckout}
                  className="w-full"
                  variant="default"
                  size="lg"
                >
                  Proceed to Checkout →
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
