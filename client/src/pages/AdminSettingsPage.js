import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Loading from '../components/ui/Loading';

const AdminSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    min_order_amount: '',
    free_delivery_threshold: '',
    delivery_fee: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/settings');
      const data = response.data?.data || {};
      setSettings({
        min_order_amount: data.min_order_amount ?? '0',
        free_delivery_threshold: data.free_delivery_threshold ?? '300',
        delivery_fee: data.delivery_fee ?? '50',
      });
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const min = parseFloat(settings.min_order_amount);
    const threshold = parseFloat(settings.free_delivery_threshold);
    const fee = parseFloat(settings.delivery_fee);

    if (isNaN(min) || min < 0) { toast.error('Minimum order amount must be 0 or more'); return; }
    if (isNaN(threshold) || threshold < 0) { toast.error('Free delivery threshold must be 0 or more'); return; }
    if (isNaN(fee) || fee < 0) { toast.error('Delivery fee must be 0 or more'); return; }

    try {
      setSaving(true);
      await api.put('/admin/settings', {
        min_order_amount: min,
        free_delivery_threshold: threshold,
        delivery_fee: fee,
      });
      toast.success('Settings saved successfully!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure cart and delivery thresholds. Changes apply immediately to new orders.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-1">
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="min_order_amount">
            Minimum Cart Order Amount (₹)
          </label>
          <p className="text-xs text-gray-400 mb-3">Users cannot check out below this amount. Set to 0 to disable.</p>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 font-semibold">₹</span>
            <input
              id="min_order_amount"
              type="number"
              name="min_order_amount"
              value={settings.min_order_amount}
              onChange={handleChange}
              min="0"
              step="1"
              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="0"
            />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-1">
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="free_delivery_threshold">
            Free Delivery Above (₹)
          </label>
          <p className="text-xs text-gray-400 mb-3">Orders above this amount get free delivery. Set to 0 to always charge delivery fee.</p>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 font-semibold">₹</span>
            <input
              id="free_delivery_threshold"
              type="number"
              name="free_delivery_threshold"
              value={settings.free_delivery_threshold}
              onChange={handleChange}
              min="0"
              step="1"
              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="300"
            />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-1">
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="delivery_fee">
            Delivery Fee (₹)
          </label>
          <p className="text-xs text-gray-400 mb-3">The delivery charge applied when the order is below the free delivery threshold.</p>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 font-semibold">₹</span>
            <input
              id="delivery_fee"
              type="number"
              name="delivery_fee"
              value={settings.delivery_fee}
              onChange={handleChange}
              min="0"
              step="1"
              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};

export default AdminSettingsPage;
