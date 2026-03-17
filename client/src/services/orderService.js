import api from './api';

export const orderService = {
  // Create Razorpay order for card payment
  async createPaymentIntent(amount, currency = 'INR', description) {
    try {
      const response = await api.post('/razorpay/create-order', {
        amount,
        currency,
        receipt: description,
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Failed to create Razorpay order:', error);
      throw new Error(error.response?.data?.message || 'Failed to create payment order');
    }
  },

  // Get user's orders
  async getOrders(page = 1, limit = 10) {
    try {
      const response = await api.get('/orders', { params: { page, limit } });
      // Support both { data: { orders } } and { orders } formats
      return response.data?.data || response.data;
    } catch (error) {
      throw new Error('Failed to fetch orders');
    }
  },

  // Get a single order by ID
  async getOrder(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}`);
      // Support both { data: { order, items } } and { order, items } formats
      return response.data?.data || response.data;
    } catch (error) {
      throw new Error('Failed to fetch order');
    }
  },

  // Create a new order
  async createOrder(orderData) {
    try {
      console.log('OrderService: Creating order with data:', orderData);

      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        throw new Error('Order must contain at least one item');
      }
      if (!orderData.shippingAddress) {
        throw new Error('Shipping address is required');
      }
      if (!orderData.paymentMethod) {
        throw new Error('Payment method is required');
      }

      const transformedOrderData = {
        items: orderData.items,
        shipping_address: orderData.shippingAddress,
        billing_address: orderData.billingAddress,
        payment_method: orderData.paymentMethod,
        payment_details: orderData.paymentDetails,
        payment_intent_id: orderData.paymentIntentId,
        coupon_code: orderData.couponCode || null,
        notes: orderData.notes,
      };

      const response = await api.post('/orders', transformedOrderData);
      console.log('OrderService: Order created:', response.data);
      // Return { data: { order, orderNumber, ... } }
      return response.data?.data || response.data;
    } catch (error) {
      console.error('OrderService: Error creating order:', error);
      const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to create order';
      throw new Error(msg);
    }
  },

  // Update order status
  async updateOrderStatus(orderId, status) {
    try {
      const response = await api.put(`/orders/${orderId}/status`, { status });
      return response.data;
    } catch (error) {
      throw new Error('Failed to update order status');
    }
  },

  // Cancel order
  async cancelOrder(orderId, reason) {
    try {
      const response = await api.post(`/orders/${orderId}/cancel`, { reason });
      return response.data;
    } catch (error) {
      throw new Error('Failed to cancel order');
    }
  },

  // Get order tracking information
  async getOrderTracking(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}/tracking`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch tracking information');
    }
  },

  // Request order return/refund
  async requestReturn(orderId, returnData) {
    try {
      const response = await api.post(`/orders/${orderId}/return`, returnData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to request return');
    }
  },

  // Get order history for a specific product
  async getProductOrderHistory(productId) {
    try {
      const response = await api.get(`/orders/product/${productId}/history`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch product order history');
    }
  },

  // Download order invoice
  async downloadInvoice(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}/invoice`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to download invoice');
    }
  }
};
