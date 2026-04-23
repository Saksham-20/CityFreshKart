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
  // NOTE: amount is now ignored if backendOrderId is provided — the backend uses DB total_price
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
  // FIX: signature is now required — the backend verifies it before confirming the order
  async updateOrderPayment(orderId, razorpay_payment_id, razorpay_order_id, signature) {
    try {
      const response = await api.put('/razorpay/update-order-payment', {
        orderId,
        razorpay_payment_id,
        razorpay_order_id,
        signature,
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

    // Create Razorpay order on backend (backend ignores amount and uses DB total_price when backendOrderId is set)
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
          // Step 1: Verify payment signature + amount with backend
          const verified = await razorpayService.verifyPayment({
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
          });

          // Step 2: Confirm backend order (if applicable), passing signature for server-side re-verification
          if (backendOrderId && response.razorpay_signature) {
            try {
              await razorpayService.updateOrderPayment(
                order.backendOrderId || backendOrderId,
                response.razorpay_payment_id,
                response.razorpay_order_id,
                response.razorpay_signature,
              );
            } catch (updateErr) {
              // Non-fatal if verifyPayment already succeeded — order may already be confirmed
              console.warn('[RazorpayService] updateOrderPayment failed:', updateErr.message);
            }
          }

          if (onSuccess) onSuccess({
            ...verified,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
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
