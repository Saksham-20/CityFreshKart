import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { useCart } from '../hooks/useCart';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import Button from '../components/ui/Button';

const CartPage = () => {
  const navigate = useNavigate();
  const { items, getCartItemCount, summary } = useCart();

  const handleCheckout = () => navigate('/checkout');

  if (items.length === 0) {
    return (
      <>
        <Navbar onCartClick={() => navigate('/cart')} />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
          <div className="w-24 h-24 bg-fresh-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-fresh-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Looks like you haven't added anything yet. Start shopping for fresh farm produce!
          </p>
          <Link to="/products">
            <Button className="w-full sm:w-auto">🛒 Start Shopping</Button>
          </Link>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <Navbar onCartClick={() => navigate('/cart')} />
      <div className="min-h-screen bg-gray-50 pt-20 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Shopping Cart</h1>
          <p className="text-sm text-gray-500">
            {getCartItemCount()} item{getCartItemCount() !== 1 ? 's' : ''} in your cart
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Items</h2>
              </div>

              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </div>
            </div>

            <div className="mt-4">
              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 text-sm text-fresh-green hover:text-fresh-green-dark font-medium transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary — desktop sidebar */}
          <div className="lg:w-80 hidden lg:block">
            <div className="sticky top-24">
              <CartSummary onCheckout={handleCheckout} />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Checkout Bar — mobile only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30 safe-area-inset-bottom">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">{getCartItemCount()} items</span>
          <span className="text-base font-bold text-gray-900">
            ₹{(summary?.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <Button onClick={handleCheckout} className="w-full">
          Proceed to Checkout →
        </Button>
      </div>
    </div>
    </>
  );
};

export default CartPage;
