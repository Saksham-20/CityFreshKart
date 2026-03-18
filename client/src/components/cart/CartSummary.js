import React from 'react';
import useCart from '../../hooks/useCart';
import Button from '../ui/Button';

const FREE_DELIVERY_THRESHOLD = 300;

const CartSummary = ({ onCheckout, showCheckoutButton = true }) => {
  const { items, calculateSummary, getCartItemCount } = useCart();
  const { subtotal, deliveryFee, total } = calculateSummary();
  const itemCount = getCartItemCount();

  const amountToFreeDelivery = Math.max(FREE_DELIVERY_THRESHOLD - subtotal, 0);
  const deliveryProgress = Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100);

  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
        <p className="text-gray-400 text-center py-8 text-sm">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-5">Order Summary</h3>

      {/* Free Delivery Progress */}
      {deliveryFee > 0 ? (
        <div className="mb-5 p-3 bg-green-50 rounded-xl border border-green-100">
          <p className="text-xs font-medium text-green-700 mb-2">
            Add ₹{amountToFreeDelivery.toFixed(0)} more for <strong>FREE delivery</strong>
          </p>
          <div className="w-full h-1.5 bg-green-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${deliveryProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mb-5 p-3 bg-green-50 rounded-xl border border-green-100">
          <p className="text-xs font-semibold text-green-700">
            You've unlocked <strong>FREE delivery!</strong>
          </p>
        </div>
      )}

      <div className="space-y-3 mb-5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal ({itemCount} kg)</span>
          <span className="text-gray-800 font-medium" data-testid="subtotal">
            ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Delivery</span>
          <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : 'text-gray-800 font-medium'} data-testid="delivery-fee">
            {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
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
    </div>
  );
};

export default CartSummary;
