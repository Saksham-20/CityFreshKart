import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getPublicApiOrigin } from '../utils/publicOrigin';

const useOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  const fetchOrders = useCallback(async (page = 1) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const apiUrl = getPublicApiOrigin();
      const response = await fetch(`${apiUrl}/api/orders?page=${page}&limit=${pagination.itemsPerPage}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      
      setOrders(data.orders);
      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalPages: data.pagination.totalPages,
        totalItems: data.pagination.totalItems
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, pagination.itemsPerPage]);

  const fetchOrderById = useCallback(async (orderId) => {
    if (!user) return null;

    try {
      const apiUrl = getPublicApiOrigin();
      const response = await fetch(`${apiUrl}/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [user]);

  const createOrder = useCallback(async (orderData) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const apiUrl = getPublicApiOrigin();
      const response = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order');
      }

      const order = await response.json();
      
      // Add new order to the list
      setOrders(prev => [order, ...prev]);
      
      return order;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  const cancelOrder = useCallback(async (orderId) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const apiUrl = getPublicApiOrigin();
      const response = await fetch(`${apiUrl}/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel order');
      }

      // Update order status in the list
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: 'cancelled' }
          : order
      ));

      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: page }));
    }
  }, [pagination.totalPages]);

  const refreshOrders = useCallback(() => {
    fetchOrders(pagination.currentPage);
  }, [fetchOrders, pagination.currentPage]);

  // Fetch orders when user changes or page changes
  useEffect(() => {
    if (user) {
      fetchOrders(pagination.currentPage);
    }
  }, [user, pagination.currentPage, fetchOrders]);

  // Clear orders when user logs out
  useEffect(() => {
    if (!user) {
      setOrders([]);
      setPagination(prev => ({ ...prev, currentPage: 1, totalPages: 1, totalItems: 0 }));
    }
  }, [user]);

  return {
    orders,
    loading,
    error,
    pagination,
    fetchOrderById,
    createOrder,
    cancelOrder,
    goToPage,
    refreshOrders,
    refetch: () => fetchOrders(pagination.currentPage)
  };
};

export default useOrders;
