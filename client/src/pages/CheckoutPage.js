import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCart from '../hooks/useCart';
import useAuth from '../hooks/useAuth';
import { orderService } from '../services/orderService';
import CheckoutForm from '../components/cart/CheckoutForm';
import CartSummary from '../components/cart/CartSummary';
import Breadcrumb from '../components/common/Breadcrumb';
import Loading from '../components/ui/Loading';
import Modal from '../components/ui/Modal';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items: cart, clearCart, summary } = useCart();
  const { user } = useAuth();

  const total = summary?.estimated_total || 0;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

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

  const handleCheckout = async (formData) => {
    try {
      setLoading(true);
      setError('');

      // Create payment intent if paying by card
      let paymentIntentId = null;
      if (formData.paymentMethod === 'card') {
        try {
          const paymentIntentResponse = await orderService.createPaymentIntent(
            summary?.estimated_total,
            'inr',
            `Order for ${user.email}`
          );
          paymentIntentId = paymentIntentResponse?.data?.paymentIntentId;
          
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
        items: cart.map(item => ({
          id: item.product_id || item.id,
          name: item.name || item.product_name,
          price: item.price,
          price_per_kg: item.price_per_kg || null,
          weight: item.weight || null,
          quantity: item.quantity,
          variant: item.variant_details || item.variant || null,
          image: item.primary_image || item.image
        })),
        shippingAddress: {
          ...formData.address,
          phone: `${formData.phoneCountryCode} ${formData.phone}`
        },
        billingAddress: {
          ...formData.address,
          phone: `${formData.phoneCountryCode} ${formData.phone}`
        },
        paymentMethod: formData.paymentMethod,
        paymentIntentId: paymentIntentId,
        paymentDetails: formData.paymentMethod === 'card' ? formData.payment : {},
        notes: formData.notes || ''
      };

      const response = await orderService.createOrder(orderData);

      if (response && response.data) {
        setOrderNumber(response.data.orderNumber || response.data.order_number || 'N/A');
        setShowSuccessModal(true);
        setTimeout(() => { clearCart(); }, 100);
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
    <div className="min-h-screen bg-gray-50">
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
            <div className="sticky top-24">
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
  );
};

export default CheckoutPage;
