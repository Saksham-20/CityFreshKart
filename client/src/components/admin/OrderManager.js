import React, { useState, useEffect, useCallback } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Loading from '../ui/Loading';
import api from '../../services/api';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Accepted',
  delivered: 'Delivered',
  cancelled: 'Rejected',
};

const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['delivered'],
  delivered: [],
  cancelled: [],
};

const ALL_STATUSES = ['pending', 'confirmed', 'delivered', 'cancelled'];

const statusLabel = (s) => STATUS_LABELS[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const OrderManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [adminNote, setAdminNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await api.get('/admin/orders', { params });
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (updatingStatus || showDetailsModal || showStatusModal) return;
      fetchOrders();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchOrders, updatingStatus, showDetailsModal, showStatusModal]);

  const handleStatusUpdate = async () => {
    if (!selectedOrder) return;
    try {
      setUpdatingStatus(true);
      await api.put(`/admin/orders/${selectedOrder.id}/status`, {
        status: selectedStatus,
        admin_note: adminNote.trim() || undefined,
      });
      setShowStatusModal(false);
      setSelectedOrder(null);
      setAdminNote('');
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error.response?.data?.message || error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openDetailsModal = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const openStatusModal = (order) => {
    setSelectedOrder(order);
    const nextStatuses = STATUS_FLOW[order.status] || [];
    setSelectedStatus(nextStatuses[0] || order.status);
    setAdminNote('');
    setShowStatusModal(true);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      (order.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading && orders.length === 0) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Order Management</h1>
        <button onClick={fetchOrders} className="text-sm text-blue-600 hover:underline font-medium">
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by order number, customer name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {ALL_STATUSES.map(s => {
          const count = orders.filter(o => o.status === s).length;
          if (count === 0) return null;
          return (
            <span key={s} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[s]}`}>
              {statusLabel(s)}: {count}
            </span>
          );
        })}
      </div>

      {/* Mobile order cards */}
      <div className="space-y-3 md:hidden">
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-500">No orders found</div>
        ) : filteredOrders.map((order) => (
          <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">#{order.order_number}</p>
                <p className="text-xs text-gray-500">{order.name || 'Unknown'} · {order.phone || '—'}</p>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                {statusLabel(order.status)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
              <span>{new Date(order.created_at).toLocaleDateString('en-IN')}</span>
              <span className="font-bold text-gray-900">₹{(parseFloat(order.total_price) || 0).toFixed(2)}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => openDetailsModal(order)}>View</Button>
              {STATUS_FLOW[order.status]?.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => openStatusModal(order)}>Update</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop orders table */}
      <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No orders found</td>
                </tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">#{order.order_number}</div>
                    <div className="text-xs text-gray-500">{order.item_count || 0} item{order.item_count !== 1 ? 's' : ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">{order.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{order.phone || '—'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ₹{(parseFloat(order.total_price) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openDetailsModal(order)}>
                      View
                    </Button>
                    {STATUS_FLOW[order.status]?.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => openStatusModal(order)}>
                        Update Status
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Order Details Modal ── */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Order #${selectedOrder?.order_number}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Header info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Order Info</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Number:</span> <span className="font-medium">#{selectedOrder.order_number}</span></p>
                  <p><span className="text-gray-500">Date:</span> {new Date(selectedOrder.created_at).toLocaleString('en-IN')}</p>
                  <p className="flex items-center gap-2">
                    <span className="text-gray-500">Status:</span>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[selectedOrder.status] || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabel(selectedOrder.status)}
                    </span>
                  </p>
                  <p><span className="text-gray-500">Payment:</span> <span className="capitalize">{selectedOrder.payment_method || 'N/A'}</span></p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Customer</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Name:</span> <span className="font-medium">{selectedOrder.name || 'N/A'}</span></p>
                  <p><span className="text-gray-500">Phone:</span> {selectedOrder.phone || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                Items ({(selectedOrder.items || []).length})
              </h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty (kg)</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Rate/kg</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(selectedOrder.items || []).length > 0 ? (
                      (selectedOrder.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 font-medium text-gray-900">{item.product_name}</td>
                          <td className="px-4 py-2 text-right text-gray-700">{item.quantity_kg}</td>
                          <td className="px-4 py-2 text-right text-gray-700">₹{(parseFloat(item.price_per_kg) || 0).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-right font-semibold text-gray-900">
                            ₹{(parseFloat(item.total_price) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="px-4 py-3 text-center text-gray-400">No items</td></tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-500">Subtotal</td>
                      <td className="px-4 py-2 text-right text-sm text-gray-700">₹{(parseFloat(selectedOrder.subtotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-500">Delivery Fee</td>
                      <td className="px-4 py-2 text-right text-sm text-gray-700">
                        {parseFloat(selectedOrder.delivery_fee) === 0 ? 'Free' : `₹${parseFloat(selectedOrder.delivery_fee).toLocaleString('en-IN')}`}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right font-bold text-gray-900">Total</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">
                        ₹{(parseFloat(selectedOrder.total_price) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Delivery Address */}
            {selectedOrder.delivery_address && (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Delivery Address</h4>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-line">
                  {selectedOrder.delivery_address}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedOrder.notes && (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes / Instructions</h4>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-gray-700 whitespace-pre-line">
                  {selectedOrder.notes}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 gap-2 flex-wrap">
              {STATUS_FLOW[selectedOrder.status]?.length > 0 && (
                <Button onClick={() => { setShowDetailsModal(false); openStatusModal(selectedOrder); }}>
                  Update Status
                </Button>
              )}
              <Button variant="outline" onClick={() => window.print()} className="ml-2">
                🖨 Print Bill
              </Button>
              <Button variant="outline" onClick={() => setShowDetailsModal(false)} className="ml-auto">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Update Status Modal ── */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Order Status"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <span className="text-gray-500">Order</span>{' '}
                <span className="font-semibold">#{selectedOrder.order_number}</span>
              </div>
              <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[selectedOrder.status] || 'bg-gray-100 text-gray-800'}`}>
                {statusLabel(selectedOrder.status)}
              </span>
              <span className="text-gray-400 text-sm">→</span>
              <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[selectedStatus] || 'bg-gray-100 text-gray-800'}`}>
                {statusLabel(selectedStatus)}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
              <div className="space-y-2">
                {/* Forward transition options */}
                {STATUS_FLOW[selectedOrder.status]?.map(s => (
                  <label key={s} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedStatus === s ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="status" value={s} checked={selectedStatus === s}
                      onChange={() => setSelectedStatus(s)} className="accent-blue-600" />
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[s]}`}>
                      {statusLabel(s)}
                    </span>
                    {s === 'cancelled' && <span className="text-xs text-gray-500">— will restore stock</span>}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Note <span className="text-gray-400 font-normal">(optional — visible to user in order details)</span>
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder="e.g. Your order has been dispatched via local courier..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowStatusModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={updatingStatus || selectedStatus === selectedOrder.status}
              >
                {updatingStatus ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrderManager;
