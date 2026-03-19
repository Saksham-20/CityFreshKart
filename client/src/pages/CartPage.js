import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useCart from '../hooks/useCart';
import { getImageUrl, getPlaceholderImage } from '../utils/imageUtils';

const WEIGHT_STEP = 0.5;
const FREE_DELIVERY_THRESHOLD = 300;

const CartPage = () => {
  const navigate = useNavigate();
  const { items, removeFromCart, updateItemQuantity, getCartItemCount, calculateSummary } = useCart();
  const { subtotal, deliveryFee, total } = calculateSummary();

  const amountToFree = Math.max(FREE_DELIVERY_THRESHOLD - subtotal, 0);
  const deliveryProgress = Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100);

  const handleIncrease = (item) => updateItemQuantity(item.id, parseFloat((item.quantity + WEIGHT_STEP).toFixed(2)));
  const handleDecrease = (item) => {
    const newQty = parseFloat((item.quantity - WEIGHT_STEP).toFixed(2));
    if (newQty <= 0) removeFromCart(item.id);
    else updateItemQuantity(item.id, newQty);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-14 flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="text-6xl mb-5">🛒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Start adding fresh vegetables, fruits and more!
          </p>
          <Link
            to="/products"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors shadow-md"
          >
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-14 pb-[11.5rem] sm:pb-36">
      <div className="max-w-lg mx-auto px-0 sm:px-4 py-3 sm:py-4">

        {/* Delivery info banner */}
        <div className="mx-3 sm:mx-0 mb-3 bg-white rounded-xl border border-gray-100 overflow-hidden">
          {deliveryFee > 0 ? (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-700">
                  Add <span className="text-green-600 font-bold">₹{amountToFree.toFixed(0)}</span> more for free delivery
                </p>
                <span className="text-[10px] text-gray-400">{Math.round(deliveryProgress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${deliveryProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 flex items-center gap-2 bg-green-50">
              <span className="text-green-600 font-bold text-sm">🎉</span>
              <p className="text-xs font-bold text-green-700">You've unlocked FREE delivery!</p>
            </div>
          )}
        </div>

        {/* Delivery time bar */}
        <div className="mx-3 sm:mx-0 mb-3 bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
          <span className="text-xl">⚡</span>
          <div>
            <p className="text-sm font-bold text-gray-800">Delivery in 30 minutes</p>
            <p className="text-xs text-gray-400">Fresh to your doorstep</p>
          </div>
        </div>

        {/* Cart items */}
        <div className="mx-3 sm:mx-0 bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Your Items</h2>
            <span className="text-xs text-gray-400">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
          </div>

          {items.map((item) => {
            const pricePerKg = item.price_per_kg || 0;
            const discountedPricePerKg = item.discount ? pricePerKg * (1 - item.discount / 100) : pricePerKg;
            const lineTotal = (discountedPricePerKg * item.quantity).toFixed(2);

            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                {/* Image */}
                <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                  <img
                    src={getImageUrl(item.image_url)}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = getPlaceholderImage(); }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate pr-1">{item.name}</h3>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors p-0.5 -mt-0.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    ₹{pricePerKg}/kg{item.discount > 0 ? ` · ${item.discount}% off` : ''}
                  </p>

                  <div className="flex items-center justify-between mt-1.5">
                    {/* Qty control */}
                    <div className="flex items-center bg-green-600 rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleDecrease(item)}
                        className="w-7 h-6 flex items-center justify-center text-white text-sm font-bold hover:bg-green-700 transition-colors"
                      >
                        −
                      </button>
                      <span className="text-white text-[11px] font-bold px-2 min-w-[2.5rem] text-center">
                        {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)} kg
                      </span>
                      <button
                        onClick={() => handleIncrease(item)}
                        className="w-7 h-6 flex items-center justify-center text-white text-sm font-bold hover:bg-green-700 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-bold text-gray-900">₹{lineTotal}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue shopping */}
        <div className="mx-3 sm:mx-0 mt-3">
          <Link to="/products" className="flex items-center gap-1.5 text-sm text-green-600 font-medium hover:text-green-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Continue Shopping
          </Link>
        </div>
      </div>

      {/* Sticky bottom checkout bar */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 pb-5 z-50 shadow-2xl"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        {/* Price summary */}
        <div className="flex items-center justify-between mb-3 text-sm">
          <div className="flex items-center gap-3 text-gray-500">
            <span>{getCartItemCount().toFixed(1)} kg</span>
            <span>·</span>
            <span>Delivery: <span className={deliveryFee === 0 ? 'text-green-600 font-bold' : 'font-medium text-gray-700'}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></span>
          </div>
          <div className="text-right">
            <span className="text-base font-extrabold text-gray-900">₹{total.toFixed(2)}</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/checkout')}
          className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-3.5 rounded-xl text-base transition-colors shadow-md"
        >
          Proceed to Checkout →
        </button>
      </div>
    </div>
  );
};

export default CartPage;
