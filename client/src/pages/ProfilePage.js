import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Loading from '../components/ui/Loading';
import Breadcrumb from '../components/common/Breadcrumb';
import api from '../services/api';
import toast from 'react-hot-toast';
import { addressService } from '../services/addressService';
import { subscribeToWebPush } from '../utils/pwa';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(user || {});
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Address state
  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    addressLine: '',
    houseNumber: '',
    floor: '',
    society: '',
    sector: '',
    isDefault: false,
  });
  const [activeSection, setActiveSection] = useState('profile');

  // Recent orders state
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [pushSubscribing, setPushSubscribing] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);

  const vapidConfigured = !!process.env.REACT_APP_VAPID_PUBLIC_KEY;

  const ORDER_STATUS_LABELS = {
    pending: 'Pending', confirmed: 'Accepted', delivered: 'Delivered', cancelled: 'Rejected',
  };
  const ORDER_STATUS_COLORS = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && activeSection === 'addresses') {
      fetchAddresses();
    }
    if (user && activeSection === 'orders') {
      fetchRecentOrders();
    }
  }, [user, activeSection]);

  useEffect(() => {
    if (activeSection !== 'security') return;
    if (!vapidConfigured) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (sessionStorage.getItem('cfk_push_intro_v2')) return;
    sessionStorage.setItem('cfk_push_intro_v2', '1');
    setShowPushModal(true);
  }, [activeSection, vapidConfigured]);

  useEffect(() => () => {
    setPushSubscribing(false);
  }, []);

  const fetchRecentOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await api.get('/orders', { params: { limit: 10 } });
      const data = response.data?.data?.orders || [];
      setRecentOrders(data);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      setAddressLoading(true);
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch {
      toast.error('Failed to load addresses');
    } finally {
      setAddressLoading(false);
    }
  };

  const openAddressForm = (address = null) => {
    if (address) {
      setEditingAddress(address);
      setAddressForm({
        addressLine: address.address_line || '',
        houseNumber: address.house_number || '',
        floor: address.floor || '',
        society: address.society || '',
        sector: address.sector || '',
        isDefault: address.is_default || false,
      });
    } else {
      setEditingAddress(null);
      setAddressForm({
        addressLine: '',
        houseNumber: '',
        floor: '',
        society: '',
        sector: '',
        isDefault: false,
      });
    }
    setShowAddressForm(true);
  };

  const handleAddressFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveAddress = async () => {
    if (!addressForm.addressLine || !addressForm.houseNumber) {
      toast.error('Please fill all required address fields');
      return;
    }
    try {
      setAddressLoading(true);
      if (editingAddress) {
        await addressService.updateAddress(editingAddress.id, addressForm);
        toast.success('Address updated');
      } else {
        await addressService.addAddress(addressForm);
        toast.success('Address added');
      }
      setShowAddressForm(false);
      fetchAddresses();
    } catch {
      toast.error('Failed to save address');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await addressService.deleteAddress(id);
      toast.success('Address deleted');
      fetchAddresses();
    } catch {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await addressService.setDefault(id);
      toast.success('Default address updated');
      fetchAddresses();
    } catch {
      toast.error('Failed to update default address');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const response = await api.put('/users/profile', {
        name: formData.name,
        email: formData.email
      });

      toast.success(response.data?.message || 'Profile updated successfully!');
      setProfile(response.data?.data?.user || { ...profile, ...formData });
      setEditMode(false);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validate inputs
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Password change failed');
      }
      toast.success(response.data?.message || 'Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to change password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const handleOpenPushModal = () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications.');
      return;
    }
    if (Notification.permission === 'denied') {
      toast.error(
        'Notifications are blocked for this site. Use the lock or site icon in the address bar → Site settings → Notifications → Allow, then try again.',
        { duration: 6500 },
      );
      return;
    }
    setShowPushModal(true);
  };

  const handleConfirmPushSubscribe = async () => {
    if (!vapidConfigured) {
      setShowPushModal(false);
      return;
    }
    try {
      setPushSubscribing(true);
      await subscribeToWebPush();
      toast.success('Push notifications enabled successfully');
      setShowPushModal(false);
    } catch (error) {
      toast.error(error.message || 'Failed to enable notifications');
    } finally {
      setPushSubscribing(false);
    }
  };

  if (!user) {
    return <Loading />;
  }

  return (
    <>
      <Modal
        isOpen={showPushModal}
        onClose={() => {
          setPushSubscribing(false);
          setShowPushModal(false);
        }}
        title="Enable push notifications?"
        size="sm"
        closeOnOverlayClick={!pushSubscribing}
        closeOnEscape={!pushSubscribing}
      >
        <div className="space-y-4">
          {!vapidConfigured ? (
            <p className="text-sm text-on-surface-variant">
              Push notifications are not configured for this build. Set
              {' '}
              <code className="text-xs bg-surface-container-low px-1 rounded">REACT_APP_VAPID_PUBLIC_KEY</code>
              {' '}
              at build time to match the server&apos;s VAPID public key.
            </p>
          ) : (
            <p className="text-sm text-on-surface-variant">
              Get order updates and alerts on this device. Your browser will ask for permission next — you can change it later in site settings.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={pushSubscribing}
              onClick={() => {
                setPushSubscribing(false);
                setShowPushModal(false);
              }}
              className="px-4 py-2 rounded-lg bg-surface-container-highest text-on-surface font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {vapidConfigured ? 'Cancel' : 'Close'}
            </button>
            {vapidConfigured && (
              <Button type="button" onClick={handleConfirmPushSubscribe} loading={pushSubscribing}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <div className="min-h-screen bg-surface pt-14 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Breadcrumb />

          {/* Page Header */}
          <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-on-surface mb-1">
            My Profile
          </h1>
          <p className="text-sm text-on-surface-variant">
            Manage your account information and settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 shadow-editorial p-6 sticky top-24">
              {/* Avatar */}
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full flex items-center justify-center text-4xl font-headline font-bold mx-auto mb-4 shadow-primary-glow">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <h2 className="font-semibold text-on-surface">{user?.name || 'User'}</h2>
                <p className="text-sm text-on-surface-variant">{user?.email || user?.phone}</p>
              </div>

              {/* Menu */}
              <div className="space-y-1">
                {[
                  { id: 'profile', label: 'Profile Info', icon: '👤' },
                  { id: 'addresses', label: 'Saved Addresses', icon: '📍' },
                  { id: 'orders', label: 'My Orders', icon: '📦' },
                  { id: 'security', label: 'Security', icon: '🔒' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      activeSection === item.id
                        ? 'bg-secondary-container/40 text-primary'
                        : 'text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
                <div className="border-t border-surface-container pt-1 mt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 rounded-xl text-sm font-medium text-error hover:bg-error-container/30 transition-colors"
                  >
                    🚪 Logout
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── Profile Information ── */}
            {activeSection === 'profile' && (
              <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 shadow-editorial p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-on-surface">Profile Information</h3>
                  {!editMode && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="text-sm font-medium text-fresh-green hover:text-primary transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">Full Name</label>
                      <input type="text" name="name" value={formData.name} onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-lg bg-surface-container-highest focus:ring-2 focus:ring-2 focus:ring-primary/25 ghost-outline-primary outline-none"
                        placeholder="Your name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">Email Address</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-lg bg-surface-container-highest focus:ring-2 focus:ring-2 focus:ring-primary/25 ghost-outline-primary outline-none"
                        placeholder="your@email.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">Phone Number (Cannot be changed)</label>
                      <input type="tel" value={formData.phone} disabled
                        className="w-full px-4 py-2 rounded-lg bg-surface-container-highest bg-gray-50 text-on-surface outline-none" />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button onClick={handleSaveProfile} loading={loading} className="flex-1">Save Changes</Button>
                      <button onClick={() => { setEditMode(false); setFormData({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' }); }}
                        className="flex-1 px-4 py-2 rounded-lg bg-surface-container-highest text-on-surface font-medium hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div><p className="text-sm font-medium text-on-surface-variant mb-1">Full Name</p><p className="text-on-surface">{profile.name || 'Not provided'}</p></div>
                    <div><p className="text-sm font-medium text-on-surface-variant mb-1">Email Address</p><p className="text-on-surface">{profile.email || 'Not provided'}</p></div>
                    <div><p className="text-sm font-medium text-on-surface-variant mb-1">Phone Number</p><p className="text-on-surface">{profile.phone || 'Not provided'}</p></div>
                    <div>
                      <p className="text-sm font-medium text-on-surface-variant mb-1">Member Since</p>
                      <p className="text-on-surface">
                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Saved Addresses ── */}
            {activeSection === 'addresses' && (
              <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 shadow-editorial p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-on-surface">Saved Addresses</h3>
                  {!showAddressForm && (
                    <button onClick={() => openAddressForm()}
                      className="text-sm font-medium text-fresh-green hover:underline">
                      + Add New
                    </button>
                  )}
                </div>

                {/* Add / Edit Form */}
                {showAddressForm && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <h4 className="font-semibold text-on-surface text-sm">{editingAddress ? 'Edit Address' : 'Add New Address'}</h4>
                    <div>
                      <label className="block text-xs font-medium text-on-surface-variant mb-1">Address Line *</label>
                      <input type="text" name="addressLine" value={addressForm.addressLine} onChange={handleAddressFormChange}
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-highest text-sm focus:ring-2 focus:ring-2 focus:ring-primary/25 ghost-outline-primary outline-none"
                        placeholder="House no., Street, Area" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-on-surface-variant mb-1">House Number *</label>
                      <input
                        type="text"
                        name="houseNumber"
                        value={addressForm.houseNumber}
                        onChange={handleAddressFormChange}
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-highest text-sm focus:ring-2 focus:ring-2 focus:ring-primary/25 ghost-outline-primary outline-none"
                        placeholder="e.g. 12A"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1">Floor</label>
                        <input
                          type="text"
                          name="floor"
                          value={addressForm.floor}
                          onChange={handleAddressFormChange}
                          className="w-full px-3 py-2 rounded-lg bg-surface-container-highest text-sm focus:ring-2 focus:ring-2 focus:ring-primary/25 ghost-outline-primary outline-none"
                          placeholder="e.g. 2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1">Society</label>
                        <input
                          type="text"
                          name="society"
                          value={addressForm.society}
                          onChange={handleAddressFormChange}
                          className="w-full px-3 py-2 rounded-lg bg-surface-container-highest text-sm focus:ring-2 focus:ring-2 focus:ring-primary/25 ghost-outline-primary outline-none"
                          placeholder="Building / society name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-on-surface-variant mb-1">Sector</label>
                      <input
                        type="text"
                        name="sector"
                        value={addressForm.sector}
                        onChange={handleAddressFormChange}
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-highest text-sm focus:ring-2 focus:ring-2 focus:ring-primary/25 ghost-outline-primary outline-none"
                        placeholder="e.g. Sector 62"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="isDefault" checked={addressForm.isDefault} onChange={handleAddressFormChange} className="w-4 h-4 accent-green-600" />
                      <span className="text-sm text-on-surface">Set as default delivery address</span>
                    </label>
                    <div className="flex gap-3 pt-2">
                      <Button onClick={handleSaveAddress} loading={addressLoading} className="flex-1 text-sm py-2">
                        {editingAddress ? 'Update Address' : 'Save Address'}
                      </Button>
                      <button onClick={() => setShowAddressForm(false)}
                        className="flex-1 px-4 py-2 rounded-lg bg-surface-container-highest text-on-surface text-sm font-medium hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Address List */}
                {addressLoading && !showAddressForm ? (
                  <div className="text-center py-8 text-on-surface-variant">Loading addresses...</div>
                ) : addresses.length === 0 && !showAddressForm ? (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3">📍</div>
                    <p className="text-on-surface-variant text-sm mb-4">No saved addresses yet.</p>
                    <button onClick={() => openAddressForm()}
                      className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-lg text-sm font-medium hover:opacity-95 transition-colors">
                      Add Your First Address
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map(addr => (
                      <div key={addr.id} className={`p-4 rounded-xl border-2 ${addr.is_default ? 'outline-primary bg-secondary-container/20' : 'outline-outline-variant/20 bg-surface-container-lowest'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-on-surface text-sm">Saved Address</p>
                              {addr.is_default && (
                                <span className="text-[10px] bg-gradient-to-r from-primary to-primary-container text-on-primary px-2 py-0.5 rounded-full font-semibold">Default</span>
                              )}
                            </div>
                            <p className="text-sm text-on-surface-variant">
                              {addressService.formatAddressText(addr)}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button onClick={() => openAddressForm(addr)}
                              className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                            <button onClick={() => handleDeleteAddress(addr.id)}
                              className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                            {!addr.is_default && (
                              <button onClick={() => handleSetDefault(addr.id)}
                                className="text-xs text-fresh-green hover:underline font-medium">Set Default</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Orders ── */}
            {activeSection === 'orders' && (
              <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 shadow-editorial overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-on-surface">Recent Orders</h3>
                  <button onClick={() => navigate('/orders')}
                    className="text-sm text-green-600 hover:text-green-700 font-medium">View All →</button>
                </div>
                {ordersLoading ? (
                  <div className="py-12 text-center text-on-surface-variant">Loading orders…</div>
                ) : recentOrders.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="text-4xl mb-3">📦</div>
                    <p className="text-on-surface-variant text-sm">No orders yet.</p>
                    <button onClick={() => navigate('/products')}
                      className="mt-4 px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-lg text-sm font-medium hover:opacity-95 transition-colors">
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {recentOrders.map(order => (
                      <div key={order.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-on-surface text-sm">#{order.order_number || order.id?.slice(0, 8)}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' · '}
                            {order.item_count || '?'} item{(order.item_count || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <p className="font-bold text-on-surface text-sm">
                          ₹{parseFloat(order.total_price || 0).toLocaleString('en-IN')}
                        </p>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-on-surface'}`}>
                          {ORDER_STATUS_LABELS[order.status] || order.status}
                        </span>
                        <button onClick={() => navigate(`/orders/${order.id}`)}
                          className="text-xs text-green-600 hover:text-green-700 font-semibold underline underline-offset-2 flex-shrink-0">
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Security ── */}
            {activeSection === 'security' && (
              <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 shadow-editorial p-6">
                <h3 className="text-lg font-semibold text-on-surface mb-6">Security</h3>
                {!vapidConfigured && (
                  <div
                    role="status"
                    className="mb-4 p-3 rounded-xl bg-amber-50 outline outline-1 outline-amber-200/80 text-sm text-amber-950"
                  >
                    <strong className="font-semibold">Push notifications are not configured on this deployment.</strong>
                    {' '}
                    The app build must include <code className="text-xs bg-white/80 px-1 rounded">REACT_APP_VAPID_PUBLIC_KEY</code>
                    {' '}
                    (same value as the server&apos;s VAPID public key). Contact support if alerts do not work after updating the app.
                  </div>
                )}
                {!showPasswordForm ? (
                  <div>
                    <p className="text-sm text-on-surface-variant mb-4">Manage your account security by changing your password regularly.</p>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => setShowPasswordForm(true)}
                        className="px-4 py-2 rounded-lg bg-surface-container-highest text-on-surface font-medium hover:bg-gray-50 transition-colors">
                        Change Password
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenPushModal}
                        disabled={pushSubscribing}
                        className="px-4 py-2 outline outline-2 outline-primary/40 rounded-lg text-primary font-medium hover:bg-secondary-container/30 transition-colors disabled:opacity-60"
                      >
                        {pushSubscribing ? 'Enabling...' : 'Enable Push Notifications'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { label: 'Current Password', name: 'currentPassword', placeholder: 'Enter your current password' },
                      { label: 'New Password', name: 'newPassword', placeholder: 'Enter new password' },
                      { label: 'Confirm Password', name: 'confirmPassword', placeholder: 'Confirm new password' },
                    ].map(field => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-on-surface mb-2">{field.label}</label>
                        <input type="password" name={field.name} value={passwordData[field.name]} onChange={handlePasswordChange}
                          className="w-full px-4 py-2 rounded-lg bg-surface-container-highest focus:ring-2 focus:ring-2 focus:ring-primary/25 ghost-outline-primary outline-none"
                          placeholder={field.placeholder} />
                      </div>
                    ))}
                    <div className="flex gap-3 pt-4">
                      <Button onClick={handleChangePassword} loading={loading} className="flex-1">Update Password</Button>
                      <button onClick={() => { setShowPasswordForm(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                        className="flex-1 px-4 py-2 rounded-lg bg-surface-container-highest text-on-surface font-medium hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ProfilePage;
