import React from 'react';
import useCart from '../../hooks/useCart';
import { FREE_DELIVERY_THRESHOLD, calculateDelivery } from '../../utils/weightSystem';
import Button from '../ui/Button';

const CartSummary = ({ onCheckout, showCheckoutButton = true }) => {
  const { items, summary, getCartItemCount } = useCart();

  const subtotal = summary?.subtotal || 0;
  const deliveryInfo = calculateDelivery(subtotal);
  const shipping = deliveryInfo.deliveryFee;
  const tax = subtotal * 0.05; // 5% GST
  const total = subtotal + shipping + tax;
  const itemCount = getCartItemCount();

  // Progress toward free shipping
  const shippingProgress = Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100);
  const amountToFreeShipping = Math.max(FREE_DELIVERY_THRESHOLD - subtotal, 0);

  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
        <p className="text-gray-400 text-center py-8 text-sm">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-5">Order Summary</h3>

      {/* Free Shipping Progress */}
      {shipping > 0 ? (
        <div className="mb-5 p-3 bg-fresh-green-50 rounded-xl border border-fresh-green-100">
          <p className="text-xs font-medium text-fresh-green-700 mb-2">
            🚛 Add ₹{amountToFreeShipping.toFixed(0)} more for <strong>FREE delivery</strong>
          </p>
          <div className="w-full h-1.5 bg-fresh-green-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-fresh-green rounded-full transition-all duration-500"
              style={{ width: `${shippingProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mb-5 p-3 bg-fresh-green-50 rounded-xl border border-fresh-green-100" data-testid="delivery-status">
          <p className="text-xs font-semibold text-fresh-green-700">
            🎉 You've unlocked <strong>FREE delivery!</strong>
          </p>
        </div>
      )}

      <div className="space-y-3 mb-5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
          <span className="text-gray-800 font-medium" data-testid="subtotal">
            ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Delivery</span>
          <span className={shipping === 0 ? 'text-fresh-green font-medium' : 'text-gray-800 font-medium'} data-testid="delivery-fee">
            {shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">GST (5%)</span>
          <span className="text-gray-800 font-medium">
            ₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="flex justify-between text-base font-bold">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900" data-testid="total">
              ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {showCheckoutButton && onCheckout && (
        <Button
          onClick={onCheckout}
          className="w-full"
          disabled={!items || items.length === 0}
        >
          Proceed to Checkout →
        </Button>
      )}

      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Secure & encrypted checkout
      </div>
    </div>
  );
};

export default CartSummary;
