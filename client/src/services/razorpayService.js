import api from './api';

// Loads Razorpay checkout script dynamically
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const razorpayService = {
  // Create Razorpay order on backend
  async createOrder(amount, currency = 'INR', backendOrderId = null) {
    try {
      const payload = { amount, currency };
      if (backendOrderId) {
        payload.orderId = backendOrderId;
      }
      const response = await api.post('/razorpay/create-order', payload);
      return response.data?.data || response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create payment order');
    }
  },

  // Verify payment signature on backend
  async verifyPayment(paymentData) {
    try {
      const response = await api.post('/razorpay/verify-payment', paymentData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Payment verification failed');
    }
  },

  // Update order with payment details after verification
  async updateOrderPayment(orderId, razorpay_payment_id, razorpay_order_id) {
    try {
      const response = await api.put('/razorpay/update-order-payment', {
        orderId,
        razorpay_payment_id,
        razorpay_order_id,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update order with payment');
    }
  },

  // Open Razorpay checkout modal
  async openCheckout({ amount, orderId, backendOrderId, name, email, phone, description, onSuccess, onFailure }) {
    const loaded = await loadRazorpayScript();
    if (!loaded) throw new Error('Failed to load Razorpay SDK');

    // Create Razorpay order on backend (optionally linked to existing order)
    const order = await razorpayService.createOrder(amount, 'INR', backendOrderId);

    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'CityFreshKart',
      description: description || 'Order Payment',
      order_id: order.orderId,
      prefill: { name, email, contact: phone },
      theme: { color: '#16a34a' },
      handler: async (response) => {
        try {
          const verified = await razorpayService.verifyPayment({
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
          });
          if (onSuccess) onSuccess({ 
            ...verified, 
            razorpay_payment_id: response.razorpay_payment_id, 
            razorpay_order_id: response.razorpay_order_id,
            backendOrderId: order.backendOrderId || backendOrderId,
          });
        } catch (err) {
          if (onFailure) onFailure(err);
        }
      },
      modal: {
        ondismiss: () => { if (onFailure) onFailure(new Error('Payment cancelled')); },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();

    return order;
  },
};

// Keep backward-compat alias
export const stripeService = razorpayService;
