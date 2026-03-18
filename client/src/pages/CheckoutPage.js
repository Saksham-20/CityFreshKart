import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';

const MIN_ORDER_AMOUNT = 100; // ₹100 minimum order

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCartStore();
  const { user } = useAuthStore();
  
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Redirect if cart is empty or user not logged in
  if (!items || items.length === 0) {
    navigate('/cart');
    return null;
  }

  if (!user) {
    navigate('/login', { state: { from: '/checkout' } });
    return null;
  }

  // Calculate delivery fee (free above ₹300)
  const subtotal = total;
  const deliveryFee = subtotal >= 300 ? 0 : 50;
  const totalWithDelivery = subtotal + deliveryFee;

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    
    if (!deliveryAddress.trim()) {
      setError('Please enter delivery address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create order
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            product_id: item.id,
            product_name: item.name,
            quantity_kg: item.quantity,
            price_per_kg: item.price_per_kg
          })),
          phone: user.phone,
          deliveryAddress,
          subtotal,
          deliveryFee,
          totalPrice: totalWithDelivery
        })
      });

      if (!orderResponse.ok) throw new Error('Failed to create order');
      
      const order = await orderResponse.json();

      // Initialize Razorpay payment
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: totalWithDelivery * 100,
        currency: 'INR',
        name: 'CityFreshKart',
        description: `Order #${order.order_number}`,
        order_id: order.razorpay_order_id,
        handler: async (response) => {
          // Verify payment and update order
          const verifyResponse = await fetch(`/api/orders/${order.id}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          if (verifyResponse.ok) {
            setSuccess(true);
            clearCart();
            setTimeout(() => navigate('/orders'), 2000);
          } else {
            setError('Payment verification failed');
          }
        },
        prefill: {
          contact: user.phone,
          name: user.name
        },
        theme: {
          color: '#22c55e'
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setError(err.message || 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-fresh-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-fresh-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Order Placed!</h2>
          <p className="text-gray-600 text-sm mb-4">Your order is confirmed. Check your orders page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/cart')} className="text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
      </div>

      <form onSubmit={handleOrderSubmit} className="max-w-md mx-auto p-4 space-y-4">
        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="font-semibold text-gray-900 text-sm mb-2">Order Summary</h3>
          <div className="space-y-2 text-sm">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-gray-600">
                <span>{item.name} × {item.quantity} kg</span>
                <span>₹{item.total}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 mt-2 pt-2 space-y-1 text-sm">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Delivery {subtotal >= 300 ? '(FREE)' : ''}</span>
              <span className={subtotal >= 300 ? 'text-fresh-green' : ''}>₹{deliveryFee}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
              <span>Total</span>
              <span>₹{totalWithDelivery}</span>
            </div>
          </div>
          {subtotal < 300 && (
            <p className="text-xs text-fresh-green mt-2">Add ₹{300 - subtotal} more for free delivery</p>
          )}
        </div>

        {/* Delivery  Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Address
          </label>
          <textarea
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Enter your delivery address..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fresh-green resize-none"
          />
          {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
        </div>

        {/* Payment Method Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <p className="font-medium mb-1">Payment Method</p>
          <p className="text-xs">Razorpay (Card, UPI, Wallet) - Secure & Instant</p>
        </div>

        {/* Place Order Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-fresh-green hover:bg-fresh-green/90 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg text-sm transition"
        >
          {loading ? 'Processing...' : `Pay ₹${totalWithDelivery}`}
        </button>

        {/* Continue Shopping Link */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full text-fresh-green text-sm font-medium hover:underline py-2"
        >
          Continue Shopping
        </button>
      </form>
    </div>
  );
};

export default CheckoutPage;
