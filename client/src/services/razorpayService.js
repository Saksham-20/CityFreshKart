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

    try {
      const response = await api.post('/stripe/create-payment-intent', {
        amount,
        currency,
        metadata
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to create payment intent');
    }
  },

  // Confirm payment
  async confirmPayment(paymentIntentId, paymentMethodId) {
    try {
      const response = await api.post('/stripe/confirm-payment', {
        paymentIntentId,
        paymentMethodId
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to confirm payment');
    }
  },

  // Get payment methods for user
  async getPaymentMethods() {
    try {
      const response = await api.get('/stripe/payment-methods');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch payment methods');
    }
  },

  // Add new payment method
  async addPaymentMethod(paymentMethodId) {
    try {
      const response = await api.post('/stripe/payment-methods', {
        paymentMethodId
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to add payment method');
    }
  },

  // Remove payment method
  async removePaymentMethod(paymentMethodId) {
    try {
      await api.delete(`/stripe/payment-methods/${paymentMethodId}`);
      return { success: true };
    } catch (error) {
      throw new Error('Failed to remove payment method');
    }
  },

  // Set default payment method
  async setDefaultPaymentMethod(paymentMethodId) {
    try {
      const response = await api.put(`/stripe/payment-methods/${paymentMethodId}/default`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to set default payment method');
    }
  },

  // Get payment history
  async getPaymentHistory(page = 1, limit = 10) {
    try {
      const response = await api.get('/stripe/payments', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch payment history');
    }
  },

  // Request refund
  async requestRefund(paymentIntentId, amount, reason) {
    try {
      const response = await api.post('/stripe/refunds', {
        paymentIntentId,
        amount,
        reason
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to request refund');
    }
  },

  // Get subscription details (if applicable)
  async getSubscription(subscriptionId) {
    try {
      const response = await api.get(`/stripe/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch subscription');
    }
  },

  // Cancel subscription
  async cancelSubscription(subscriptionId) {
    try {
      const response = await api.post(`/stripe/subscriptions/${subscriptionId}/cancel`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to cancel subscription');
    }
  }
};
