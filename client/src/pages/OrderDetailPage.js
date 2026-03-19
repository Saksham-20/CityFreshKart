import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { orderService } from '../services/orderService';
import { useCartStore } from '../store/useCartStore';
import Loading from '../components/ui/Loading';
import toast from 'react-hot-toast';

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const STATUS_LABELS = {
  pending: 'Order Placed',
  confirmed: 'Confirmed',
  processing: 'Preparing',
  shipped: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_ICONS = {
  pending: '🕐',
  confirmed: '✅',
  processing: '📦',
  shipped: '🚚',
  delivered: '🎉',
  cancelled: '✗',
};

const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    processing: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    shipped: 'bg-purple-100 text-purple-800 border-purple-200',
    delivered: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const StatusTimeline = ({ status }) => {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
        <span className="text-2xl">❌</span>
        <div>
          <p className="font-semibold text-red-800">Order Cancelled</p>
          <p className="text-sm text-red-600">This order has been cancelled.</p>
        </div>
      </div>
    );
  }

  const currentIndex = STATUS_STEPS.indexOf(status);

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        {STATUS_STEPS.map((step, idx) => {
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step} className="flex flex-col items-center flex-1">
              {/* Connector line */}
              {idx > 0 && (
                <div className="absolute" style={{ left: `${(idx / (STATUS_STEPS.length - 1)) * 100 - 50 / STATUS_STEPS.length}%`, top: '18px', width: `${100 / (STATUS_STEPS.length - 1)}%`, height: '2px', zIndex: 0 }}>
                </div>
              )}
              {/* Step circle */}
              <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                isCompleted
                  ? isCurrent
                    ? 'bg-green-600 border-green-600 text-white shadow-md'
                    : 'bg-green-500 border-green-500 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {isCompleted ? (isCurrent ? STATUS_ICONS[step] : '✓') : <span className="text-xs">{idx + 1}</span>}
              </div>
              <p className={`mt-2 text-[10px] font-medium text-center leading-tight ${isCompleted ? 'text-green-700' : 'text-gray-400'}`}>
                {STATUS_LABELS[step]}
              </p>
            </div>
          );
        })}
      </div>
      {/* Background connector */}
      <div className="absolute top-[18px] left-[5%] right-[5%] h-0.5 bg-gray-200 z-0" />
      <div
        className="absolute top-[18px] left-[5%] h-0.5 bg-green-500 z-0 transition-all duration-500"
        style={{ width: `${(currentIndex / (STATUS_STEPS.length - 1)) * 90}%` }}
      />
    </div>
  );
};

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCartStore();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (orderId && user) {
      fetchOrder();
    }
  }, [orderId, user]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrder(orderId);
      setOrder({
        ...(data.order || data),
        items: data.items || data.order?.items || [],
      });
    } catch (err) {
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      setCancelling(true);
      await orderService.cancelOrder(orderId);
      toast.success('Order cancelled successfully');
      fetchOrder();
    } catch (err) {
      toast.error('Failed to cancel order. Please contact support.');
    } finally {
      setCancelling(false);
    }
  };

  const handleReorder = () => {
    if (!order?.items?.length) return;
    let added = 0;
    order.items.forEach(item => {
      if (item.product_id) {
        addItem({
          id: item.product_id,
          name: item.product_name,
          price_per_kg: item.price_per_kg,
          quantity: item.quantity_kg,
          image: item.product_image || null,
          discount: 0,
        });
        added++;
      }
    });
    if (added > 0) {
      toast.success(`${added} item${added > 1 ? 's' : ''} added to cart`);
      navigate('/cart');
    }
  };

  if (loading) return <Loading />;

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Not Found</h3>
          <p className="text-sm text-gray-500 mb-6">{error || 'The order you are looking for does not exist.'}</p>
          <button onClick={() => navigate('/orders')}
            className="px-6 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors">
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const status = order.status || 'pending';
  const isPending = status === 'pending';
  const isCancelled = status === 'cancelled';

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-14 z-10">
        <button onClick={() => navigate('/orders')} className="text-gray-600 p-1 -ml-1 rounded-lg hover:bg-gray-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Order #{order.order_number || order.id?.slice(0, 8)}</h1>
          <p className="text-xs text-gray-500">
            {new Date(order.created_at || order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </p>
        </div>
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(status)}`}>
          {STATUS_LABELS[status] || status}
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* Status Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-5">Order Status</h3>
          <StatusTimeline status={status} />
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">
              Items ({(order.items || []).length})
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {(order.items || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 px-4 py-3">
                {item.product_image && (
                  <img
                    src={item.product_image}
                    alt={item.product_name}
                    className="w-12 h-12 rounded-lg object-cover border border-gray-100"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.quantity_kg} kg × ₹{(item.price_per_kg || 0).toLocaleString('en-IN')}/kg
                  </p>
                </div>
                <p className="font-semibold text-gray-900 text-sm">
                  ₹{(item.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>

          {/* Price breakdown */}
          <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-gray-50">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>₹{(order.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Delivery</span>
              <span className={order.delivery_fee === 0 ? 'text-green-600 font-medium' : ''}>
                {(order.delivery_fee || 0) === 0 ? 'Free' : `₹${order.delivery_fee}`}
              </span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
              <span>Total</span>
              <span className="text-green-700">
                ₹{(order.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Delivery Details</h3>
          </div>
          <div className="px-4 py-4 space-y-3">
            {order.delivery_address && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Delivery Address</p>
                <p className="text-sm text-gray-800 whitespace-pre-line">{order.delivery_address}</p>
              </div>
            )}
            <div className="flex gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Payment</p>
                <p className="text-sm text-gray-800 capitalize">{order.payment_method || 'N/A'}</p>
              </div>
              {order.phone && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Phone</p>
                  <p className="text-sm text-gray-800">{order.phone}</p>
                </div>
              )}
            </div>
            {order.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Delivery Instructions</p>
                <p className="text-sm text-gray-800 italic">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <button
            onClick={handleReorder}
            className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors text-sm"
          >
            Re-order
          </button>
          {isPending && !isCancelled && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 py-3 bg-white border-2 border-red-300 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors text-sm disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
          <button
            onClick={() => navigate('/orders')}
            className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            All Orders
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
