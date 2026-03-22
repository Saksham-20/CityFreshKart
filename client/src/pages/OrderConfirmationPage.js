import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { orderService } from '../services/orderService';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import Breadcrumb from '../components/common/Breadcrumb';
import { IMAGE_DIMS } from '../utils/imageUtils';
import { formatOrderLineQuantity } from '../utils/weightSystem';

const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (orderId && user) {
      fetchOrderDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, user]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const orderData = await orderService.getOrder(orderId);
      // orderService.getOrder returns response.data?.data || response.data
      // So orderData could be { order, items } directly
      setOrder({
        ...(orderData.order || orderData),
        items: orderData.items || orderData.order?.items || [],
      });
    } catch (err) {
      setError('Failed to load order details');
      console.error('Error fetching order:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-secondary-container/50 text-on-secondary-container',
      processing: 'bg-surface-container text-on-surface',
      shipped: 'bg-primary-fixed/30 text-on-primary-fixed-variant',
      delivered: 'bg-secondary-container text-secondary',
      cancelled: 'bg-error-container/50 text-error',
      refunded: 'bg-surface-container-high text-on-surface-variant'
    };
    return colors[status] || 'bg-surface-container text-on-surface-variant';
  };

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return <Loading />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-surface pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error-container/40 mb-4">
              <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-headline font-medium text-on-surface mb-2">Order Not Found</h3>
            <p className="text-sm text-on-surface-variant mb-6">{error || 'The order you are looking for does not exist.'}</p>
            <Button onClick={() => navigate('/orders')}>
              View All Orders
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order Confirmation</h1>
          <p className="mt-2 text-gray-600">Thank you for your order!</p>
        </div>

        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-primary">Order Placed Successfully!</h3>
              <div className="mt-2 text-sm text-on-surface-variant">
                <p>Your order has been received and is being processed. You will be notified when your order status is updated.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Information */}
            <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 shadow-editorial p-6">
              <h3 className="text-lg font-headline font-medium text-on-surface mb-4">Order Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-on-surface-variant">Order Number</p>
                  <p className="font-medium text-on-surface">#{order.orderNumber || order.order_number}</p>
                </div>
                <div>
                  <p className="text-on-surface-variant">Order Date</p>
                  <p className="font-medium text-on-surface">
                    {new Date(order.createdAt || order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-on-surface-variant">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                <div>
                  <p className="text-on-surface-variant">Total Amount</p>
                  <p className="font-medium text-on-surface">
                    ₹{(order.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 shadow-editorial p-6">
              <h3 className="text-lg font-headline font-medium text-on-surface mb-4">Order Items</h3>
              <div className="space-y-4">
                {(order.items || []).map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-surface-container-low rounded-xl outline outline-1 outline-outline-variant/10">
                    <img
                      src={item.product_image || '/default-product.png'}
                      alt={item.product_name}
                      width={IMAGE_DIMS.orderItem.width}
                      height={IMAGE_DIMS.orderItem.height}
                      className="w-16 h-16 rounded object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { e.target.src = '/default-product.png'; }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-on-surface">{item.product_name}</p>
                      <p className="text-sm text-on-surface-variant">
                        {formatOrderLineQuantity(item)} × ₹{(item.price_per_kg || 0).toLocaleString('en-IN')}
                        {item.pricing_type === 'per_piece' ? '/pc' : '/kg'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-on-surface">
                        ₹{(item.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            {order.delivery_address && (
              <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 shadow-editorial p-6">
                <h3 className="text-lg font-headline font-medium text-on-surface mb-4">Delivery Address</h3>
                <p className="text-sm text-on-surface-variant whitespace-pre-line">{order.delivery_address}</p>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 shadow-editorial p-6 sticky top-4">
              <h3 className="text-lg font-headline font-medium text-on-surface mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Items ({(order.items || []).length})</span>
                  <span className="text-on-surface">
                    ₹{(order.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Delivery</span>
                  <span className="text-on-surface">
                    {(order.delivery_fee || 0) === 0 ? 'Free' : `₹${(order.delivery_fee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
                <div className="border-t border-surface-container pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-on-surface">Total</span>
                    <span className="text-primary">
                      ₹{(order.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => navigate('/orders')}
                  className="w-full"
                >
                  View All Orders
                </Button>
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="w-full"
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
