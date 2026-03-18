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
  async createOrder(amount, currency = 'INR') {
    try {
      const response = await api.post('/razorpay/create-order', { amount, currency });
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

  // Open Razorpay checkout modal
  async openCheckout({ amount, orderId, name, email, phone, description, onSuccess, onFailure }) {
    const loaded = await loadRazorpayScript();
    if (!loaded) throw new Error('Failed to load Razorpay SDK');

    // Create Razorpay order on backend
    const order = await razorpayService.createOrder(amount);

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
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            orderId,
          });
          if (onSuccess) onSuccess({ ...verified, razorpay_payment_id: response.razorpay_payment_id, razorpay_order_id: response.razorpay_order_id });
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
