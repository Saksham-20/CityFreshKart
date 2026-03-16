import api from './api';

export const orderService = {
  // Create payment intent for card payment
  async createPaymentIntent(amount, currency = 'inr', description) {
    try {
      const response = await api.post('/stripe/create-payment-intent', {
        amount,
        currency,
        description
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw new Error(error.response?.data?.message || 'Failed to create payment intent');
    }
  },

  // Get user's orders
  async getOrders(page = 1, limit = 10) {
    try {
      const response = await api.get('/orders', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch orders');
    }
  },

  // Get a single order by ID
  async getOrder(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch order');
    }
  },

  // Create a new order
  async createOrder(orderData) {
    try {
      console.log('OrderService: Creating order with data:', orderData);
      
      // Validate order data before sending
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        throw new Error('Order must contain at least one item');
      }
      
      if (!orderData.shippingAddress) {
        throw new Error('Shipping address is required');
      }
      
      if (!orderData.paymentMethod) {
        throw new Error('Payment method is required');
      }
      
      console.log('OrderService: Order data validation passed');
      
      // Transform data to match backend expectations
      const transformedOrderData = {
        items: orderData.items,
        shipping_address: orderData.shippingAddress,
        billing_address: orderData.billingAddress,
        payment_method: orderData.paymentMethod,
        payment_details: orderData.paymentDetails,
        // Include payment_intent_id if available (for Stripe payments)
        payment_intent_id: orderData.paymentIntentId,
        notes: orderData.notes
      };
      
      console.log('OrderService: Transformed order data:', transformedOrderData);
      
      const response = await api.post('/orders', transformedOrderData);
      console.log('OrderService: Response received:', response);
      console.log('OrderService: Order created successfully with ID:', response?.data?.order?.id);
      return response.data;
    } catch (error) {
      console.error('OrderService: Error creating order:', error);
      console.error('OrderService: Error details:', {
        message: error.message,
        status: error.status,
        response: error.response?.data
      });
      
      // Provide more specific error messages
      if (error.message.includes('Resource not found')) {
        throw new Error('Order service is currently unavailable. Please try again later.');
      } else if (error.message.includes('Unauthorized')) {
        throw new Error('Please log in to continue with your order.');
      } else if (error.message.includes('Server error')) {
        throw new Error('Server error occurred. Please try again later.');
      } else {
        throw new Error(error.message || 'Failed to create order');
      }
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
