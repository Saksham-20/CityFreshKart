import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../services/orderService';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import Breadcrumb from '../components/common/Breadcrumb';
import { formatCurrency as formatPrice } from '../utils/formatters';

const OrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOrders = useCallback(async (pageNumber) => {
    try {
      setLoading(true);
      const data = await orderService.getOrders(pageNumber, 10);
      
      // Handle different response structures
      const ordersList = data.data?.orders || data.orders || data || [];
      const paginationInfo = data.data?.pagination || data.pagination || {};
      
      let filteredOrders = Array.isArray(ordersList) ? ordersList : [];
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => 
          (order.status || order.order_status) === statusFilter
        );
      }
      
      setOrders(filteredOrders);
      setTotalPages(paginationInfo.totalPages || paginationInfo.total_pages || 1);
      setError('');
    } catch (err) {
      setError('Failed to load orders');
      console.error('Error fetching orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders(page);
  }, [page, fetchOrders]);

  const STATUS_LABELS = {
    pending: 'Pending',
    confirmed: 'Accepted',
    delivered: 'Delivered',
    cancelled: 'Rejected',
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-secondary-container/50 text-on-secondary-container',
      confirmed: 'bg-surface-container text-on-surface',
      delivered: 'bg-secondary-container text-secondary',
      cancelled: 'bg-error-container/40 text-error',
    };
    return colors[status] || 'bg-surface-container-high text-on-surface-variant';
  };

  const getStatusText = (status) => STATUS_LABELS[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown');

  const getRejectionMessage = (order) => {
    if (!order) return '';
    const status = order.status || order.order_status;
    if (status !== 'cancelled') return '';
    return String(order.rejection_reason || order.rejectionReason || '').trim() || 'Your order is deleted';
  };

  const handleViewOrder = (orderId) => {
    navigate(`/orders/${orderId}`);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <div className="min-h-screen bg-surface pt-14 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Breadcrumb />
        
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-on-surface mb-1">
            My Orders
          </h1>
          <p className="text-sm text-on-surface-variant">
            Track and manage all your orders
          </p>
        </div>

        {/* Status Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'pending', 'confirmed', 'delivered', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              type="button"
              className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                statusFilter === status
                  ? 'bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-primary-glow'
                  : 'bg-surface-container-lowest text-on-surface outline outline-1 outline-outline-variant/20 hover:outline-primary/40'
              }`}
            >
              {status === 'all' ? 'All Orders' : getStatusText(status)}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-error-container/30 outline outline-1 outline-error/30 rounded-xl p-4 text-error">
            {error}
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-4">
          {orders.length > 0 ? (
            orders.map((order) => (
              <div
                key={order.id || order.order_id}
                className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 shadow-editorial hover:shadow-primary-glow transition-shadow overflow-hidden"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    {/* Order ID & Status */}
                    <div>
                      <h3 className="text-lg font-headline font-semibold text-on-surface">
                        Order #{order.order_number || order.id}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(order.created_at || order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status || order.order_status)}`}>
                      {getStatusText(order.status || order.order_status)}
                    </span>
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4 py-4 border-t border-surface-container">
                    <div>
                      <p className="text-xs text-on-surface-variant uppercase font-semibold">Items</p>
                      <p className="text-lg font-bold text-on-surface mt-1">
                        {order.item_count || order.items?.length || order.total_items || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant uppercase font-semibold">Total</p>
                      <p className="text-lg font-bold text-primary mt-1">
                        {formatPrice(order.total_price || order.total_amount || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Payment</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {order.payment_method || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {((order.status || order.order_status) === 'cancelled') && (
                    <div className="mb-4 p-3 rounded-xl bg-error-container/25 outline outline-1 outline-error/20">
                      <p className="text-xs font-semibold uppercase text-error mb-1">Rejected Message</p>
                      <p className="text-sm text-on-surface-variant">{getRejectionMessage(order)}</p>
                    </div>
                  )}

                  {/* Items Preview */}
                  {order.items && order.items.length > 0 && (
                    <div className="mb-4 pt-4 border-t border-surface-container">
                      <div className="space-y-2">
                        {order.items.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="text-sm text-on-surface-variant">
                            • {item.product_name || item.name} ({item.weight || '1'} kg)
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <div className="text-sm text-on-surface-variant">
                            +{order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleViewOrder(order.id || order.order_id)}
                      className="flex-1 sm:flex-none"
                      variant="default"
                    >
                      View Details
                    </Button>
                    {(order.status === 'pending' || order.order_status === 'pending') && (
                      <Button
                        variant="ghost"
                        className="flex-1 sm:flex-none"
                        disabled
                      >
                        Track
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 p-12 text-center shadow-editorial">
              <div className="mb-4">
                <svg className="w-16 h-16 text-on-surface-variant mx-auto opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-headline font-semibold text-on-surface mb-2">
                {statusFilter === 'all' ? 'No Orders Yet' : `No ${statusFilter} Orders`}
              </h3>
              <p className="text-on-surface-variant mb-6">
                {statusFilter === 'all' 
                  ? "You haven't placed any orders yet. Start shopping for fresh produce!"
                  : `You don't have any ${statusFilter} orders.`
                }
              </p>
              <Button onClick={() => navigate('/')} className="mx-auto">
                🛒 Start Shopping
              </Button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-2 rounded-full font-medium transition-colors ${
                    page === p
                      ? 'bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-primary-glow'
                      : 'outline outline-1 outline-outline-variant/20 text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-full outline outline-1 outline-outline-variant/20 text-on-surface font-medium hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default OrdersPage;
