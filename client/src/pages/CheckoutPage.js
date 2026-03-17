import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCart from '../hooks/useCart';
import useAuth from '../hooks/useAuth';
import Navbar from '../components/layout/Navbar';
import { orderService } from '../services/orderService';
import CheckoutForm from '../components/cart/CheckoutForm';
import CartSummary from '../components/cart/CartSummary';
import Breadcrumb from '../components/common/Breadcrumb';
import Loading from '../components/ui/Loading';
import Modal from '../components/ui/Modal';

const MIN_ORDER_AMOUNT = 100; // ₹100 minimum order

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items: cart, clearCart, summary, coupon, applyCoupon, removeCoupon } = useCart();
  const { user } = useAuth();

  const subtotal = summary?.subtotal || 0;
  const deliveryFee = summary?.delivery_fee || 0;
  const discount = coupon ? (coupon.discountAmount || 0) : 0;
  const tax = parseFloat(((subtotal - discount) * 0.08).toFixed(2));
  const total = parseFloat((subtotal - discount + tax + deliveryFee).toFixed(2));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Redirect if cart is empty
  if (!cart || cart.length === 0) {
    navigate('/cart');
    return null;
  }

  // Redirect if user is not logged in
  if (!user) {
    navigate('/login', { state: { from: '/checkout' } });
    return null;
  }

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    await applyCoupon(couponInput.trim().toUpperCase());
    setCouponLoading(false);
  };

  const handleCheckout = async (formData) => {
    if (total < MIN_ORDER_AMOUNT) {
      setError(`Minimum order amount is ₹${MIN_ORDER_AMOUNT}`);
      return;
    }

    if (!formData.address || !formData.address.address_line_1) {
      setError('Delivery address is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Create payment intent if paying by card
      let paymentIntentId = null;
      if (formData.paymentMethod === 'card') {
        try {
          const paymentIntentResponse = await orderService.createPaymentIntent(total, 'inr', `Order for ${user.email}`);
          paymentIntentId = paymentIntentResponse?.paymentIntentId || paymentIntentResponse?.data?.paymentIntentId;
          if (!paymentIntentId) {
            setError('Failed to initialize payment. Please try again.');
            setLoading(false);
            return;
          }
        } catch (paymentError) {
          setError(paymentError.message || 'Failed to initialize payment.');
          setLoading(false);
          return;
        }
      }

      const orderData = {
        items: cart.map((item) => ({
          id: item.product_id || item.id,
          product_id: item.product_id || item.id,
          name: item.name || item.product_name,
          price: item.price,
          price_per_kg: item.price_per_kg || null,
          weight: item.weight || null,
          quantity: item.quantity,
          variant: item.variant_details || item.variant || null,
          image: item.primary_image || item.image,
        })),
        shippingAddress: {
          ...formData.address,
          phone: formData.phone ? `${formData.phoneCountryCode || ''} ${formData.phone}`.trim() : formData.address.phone,
        },
        billingAddress: {
          ...formData.address,
          phone: formData.phone ? `${formData.phoneCountryCode || ''} ${formData.phone}`.trim() : formData.address.phone,
        },
        paymentMethod: formData.paymentMethod,
        paymentIntentId,
        paymentDetails: formData.paymentMethod === 'card' ? formData.payment : {},
        couponCode: coupon?.code || null,
        notes: formData.notes || '',
      };

      const response = await orderService.createOrder(orderData);

      if (response) {
        const num = response.orderNumber || response.order?.order_number || response.order_number || 'N/A';
        setOrderNumber(num);
        setShowSuccessModal(true);
        clearCart();
      } else {
        setError('No response received from order service');
      }
    } catch (err) {
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigate('/orders');
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <Navbar onCartClick={() => navigate('/cart')} />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="mt-1 text-sm text-gray-500">Complete your purchase</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
            <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Something went wrong</h3>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Order Information</h2>
              </div>
              <div className="p-6">
                <CheckoutForm onSubmit={handleCheckout} loading={loading} />
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Coupon Input */}
              <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Apply Coupon</h3>
                {coupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-semibold text-green-800">{coupon.code}</p>
                      <p className="text-xs text-green-600">You save ₹{coupon.discountAmount?.toFixed(2)}</p>
                    </div>
                    <button onClick={removeCoupon} className="text-red-500 hover:text-red-700 text-xs font-medium">Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Items ({summary?.item_count || 0})</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({coupon?.code})</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (8%)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span>{deliveryFee === 0 ? <span className="text-green-600">FREE</span> : `₹${deliveryFee}`}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-gray-900">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
                {total < MIN_ORDER_AMOUNT && (
                  <p className="mt-2 text-xs text-red-500">Minimum order amount is ₹{MIN_ORDER_AMOUNT}</p>
                )}
              </div>

              <CartSummary showCheckoutButton={false} />
            </div>
          </div>
        </div>

        {/* Success Modal */}
        <Modal
          isOpen={showSuccessModal}
          onClose={handleSuccessModalClose}
          title="Order Placed Successfully!"
          size="md"
        >
          <div className="text-center py-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-fresh-green-100 mb-5">
              <svg className="h-8 w-8 text-fresh-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Thank you for your order!</h3>
            <p className="text-sm text-gray-500 mb-1">
              Order number: <span className="font-semibold text-gray-900">{orderNumber}</span>
            </p>
            <p className="text-sm text-gray-400 mb-7">
              You'll receive a confirmation on your registered contact shortly.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleSuccessModalClose}
                className="bg-fresh-green text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-fresh-green-dark transition-colors duration-200"
              >
                View Orders
              </button>
              <button
                onClick={() => navigate('/products')}
                className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors duration-200"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </Modal>
        </div>
      </div>
    </>
  );
};

export default CheckoutPage;
