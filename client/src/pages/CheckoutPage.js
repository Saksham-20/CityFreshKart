import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { razorpayService } from '../services/razorpayService';
import { addressService } from '../services/addressService';
import toast from 'react-hot-toast';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, calculateSummary, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    houseNumber: '',
    floor: '',
    society: '',
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
  });
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user]);

  const loadAddresses = async () => {
    try {
      setAddressesLoading(true);
      const data = await addressService.getAddresses();
      setSavedAddresses(data);
      const defaultAddr = data.find(a => a.is_default) || data[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setUseNewAddress(false);
      } else {
        setUseNewAddress(true);
      }
    } catch {
      setUseNewAddress(true);
    } finally {
      setAddressesLoading(false);
    }
  };

  if (!items || items.length === 0) {
    navigate('/cart');
    return null;
  }

  if (!user) {
    navigate('/login', { state: { from: '/checkout' } });
    return null;
  }

  const { subtotal, deliveryFee, total } = calculateSummary();

  const validateNewAddress = () => {
    if (!useNewAddress) return '';
    const postalCode = String(newAddressForm.postalCode || '').trim();
    if (!/^\d{6}$/.test(postalCode)) return 'Please enter a valid 6-digit pincode';
    if (String(newAddressForm.houseNumber || '').trim().length > 100) return 'House number is too long';
    if (String(newAddressForm.addressLine || '').trim().length < 5) return 'Address line is too short';
    if (String(newAddressForm.city || '').trim().length < 2) return 'Please enter a valid city';
    if (String(newAddressForm.state || '').trim().length < 2) return 'Please enter a valid state';
    return '';
  };

  const getDeliveryAddress = () => {
    if (useNewAddress) {
      const { houseNumber, addressLine, city, state, postalCode } = newAddressForm;
      const ready = houseNumber && addressLine && city && state && postalCode;
      if (!ready) return '';

      return addressService.formatAddressText({
        first_name: user?.name || 'User',
        last_name: '',
        house_number: newAddressForm.houseNumber,
        floor: newAddressForm.floor,
        society: newAddressForm.society,
        address_line: newAddressForm.addressLine,
        city: newAddressForm.city,
        state: newAddressForm.state,
        postal_code: newAddressForm.postalCode,
        phone: user?.phone || '',
      });
    }
    const addr = savedAddresses.find(a => a.id === selectedAddressId);
    if (!addr) return '';
    return addressService.formatAddressText(addr);
  };

  const placeOrder = async (paymentData = {}) => {
    const orderItems = items.map(item => ({
      product_id: item.id,
      product_name: item.name,
      quantity_kg: item.quantity,
      price_per_kg: item.price_per_kg,
      discount: item.discount || 0,
    }));

    const response = await api.post('/orders', {
      items: orderItems,
      delivery_address: getDeliveryAddress(),
      notes: deliveryNotes.trim() || undefined,
      payment_method: paymentMethod,
      subtotal,
      delivery_fee: deliveryFee,
      total_price: total,
      ...paymentData,
    });

    return response;
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();

    const address = getDeliveryAddress();
    if (!address) {
      setError(useNewAddress ? 'Please enter your delivery address' : 'Please select or enter a delivery address');
      return;
    }
    const addressValidationError = validateNewAddress();
    if (addressValidationError) {
      setError(addressValidationError);
      return;
    }

    setLoading(true);
    setError('');

    // Save new address to profile if checkbox is ticked
    if (useNewAddress && saveNewAddress && address) {
      try {
        await addressService.addAddress({
          firstName: user.name || 'User',
          lastName: '',
          houseNumber: newAddressForm.houseNumber,
          floor: newAddressForm.floor,
          society: newAddressForm.society,
          addressLine: newAddressForm.addressLine,
          city: newAddressForm.city,
          state: newAddressForm.state,
          postalCode: newAddressForm.postalCode,
          phone: user.phone || '',
          isDefault: savedAddresses.length === 0,
        });
        toast.success('Address saved to your profile!');
        // Refresh addresses silently so future visits are pre-filled
        loadAddresses();
      } catch {
        // Don't block order if address save fails
      }
    }

    try {
      if (paymentMethod === 'razorpay') {
        await razorpayService.openCheckout({
          amount: total,
          name: user.name || user.phone,
          email: user.email || '',
          phone: user.phone || '',
          description: `CityFreshKart Order — ₹${total.toFixed(2)}`,
          onSuccess: async ({ razorpay_payment_id, razorpay_order_id }) => {
            try {
              const response = await placeOrder({ razorpay_payment_id, razorpay_order_id });
              if (response.data.success) {
                clearCart();
                const orderId = response.data.data?.order?.id || response.data.data?.id;
                toast.success('Order placed! Waiting for admin confirmation.', { duration: 5000 });
                navigate(orderId ? `/orders/${orderId}` : '/orders');
              } else {
                setError(response.data.message || 'Order creation failed after payment.');
              }
            } catch (err) {
              setError('Payment succeeded but order creation failed. Please contact support.');
            } finally {
              setLoading(false);
            }
          },
          onFailure: (err) => {
            setError(err.message === 'Payment cancelled' ? 'Payment was cancelled.' : 'Payment failed. Please try again.');
            setLoading(false);
          },
        });
      } else {
        const response = await placeOrder();
        if (response.data.success) {
          clearCart();
          const orderId = response.data.data?.order?.id || response.data.data?.id;
          toast.success('Order placed! Waiting for admin confirmation.', { duration: 5000 });
          navigate(orderId ? `/orders/${orderId}` : '/orders');
        } else {
          setError(response.data.message || 'Order failed. Please try again.');
          setLoading(false);
        }
      }
    } catch (err) {
      const message = err.response?.data?.error?.message || err.response?.data?.message || 'Order failed. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-[10rem]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-14 z-10">
        <button onClick={() => navigate('/cart')} className="text-gray-600 p-1 -ml-1 rounded-lg hover:bg-gray-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
      </div>

      <div className="max-w-lg mx-auto px-3 sm:px-4 pt-3 sm:pt-4 space-y-3">
        {/* Order Summary */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})</h3>
          </div>
          <div className="px-4 py-3 space-y-2">
            {items.map(item => {
              const itemPrice = item.discount
                ? item.price_per_kg * item.quantity * (1 - item.discount / 100)
                : item.price_per_kg * item.quantity;
              return (
                <div key={item.id} className="flex justify-between text-sm text-gray-600">
                  <span className="flex-1 pr-2">{item.name} × {item.quantity} kg</span>
                  <span className="font-medium text-gray-900">₹{itemPrice.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-gray-100 px-4 py-3 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Delivery {subtotal >= 300 ? '(FREE)' : ''}</span>
              <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : ''}>
                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
              </span>
            </div>
            {subtotal < 300 && (
              <p className="text-xs text-green-600">Add ₹{(300 - subtotal).toFixed(2)} more for free delivery</p>
            )}
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2">
              <span>Total</span>
              <span className="text-green-700">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <form onSubmit={handleOrderSubmit} id="checkout-form">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Delivery Address</h3>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="text-xs text-fresh-green hover:underline font-medium"
              >
                Manage Addresses
              </button>
            </div>
            <div className="px-4 py-3 space-y-3">
              {addressesLoading ? (
                <p className="text-sm text-gray-400">Loading saved addresses...</p>
              ) : (
                <>
                  {/* Saved address radio cards */}
                  {savedAddresses.map(addr => (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        !useNewAddress && selectedAddressId === addr.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryAddress"
                        checked={!useNewAddress && selectedAddressId === addr.id}
                        onChange={() => { setSelectedAddressId(addr.id); setUseNewAddress(false); if (error) setError(''); }}
                        className="mt-0.5 accent-green-600"
                      />
                      <div className="flex-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{addr.first_name} {addr.last_name}</span>
                          {addr.is_default && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">Default</span>
                          )}
                        </div>
                        <p className="text-gray-600 mt-0.5">
                          {[addr.house_number,
                            addr.floor ? `Floor ${addr.floor}` : '',
                            addr.society ? `Society ${addr.society}` : '',
                            addr.address_line,
                          ].filter(Boolean).join(', ')}
                        </p>
                        <p className="text-gray-600">{addr.city}, {addr.state} – {addr.postal_code}</p>
                        {addr.phone && <p className="text-gray-500 text-xs mt-0.5">Ph: {addr.phone}</p>}
                      </div>
                      {!useNewAddress && selectedAddressId === addr.id && (
                        <span className="text-green-600 text-xs font-bold mt-0.5">✓</span>
                      )}
                    </label>
                  ))}

                  {/* Use new address option */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      useNewAddress ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryAddress"
                      checked={useNewAddress}
                      onChange={() => { setUseNewAddress(true); if (error) setError(''); }}
                      className="mt-0.5 accent-green-600"
                    />
                    <div className="flex-1 text-sm">
                      <span className="font-semibold text-gray-900">
                        {savedAddresses.length > 0 ? '+ Use a different address' : 'Enter delivery address'}
                      </span>
                      {useNewAddress && (
                        <div className="mt-2 space-y-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">House Number *</label>
                              <input
                                type="text"
                                value={newAddressForm.houseNumber}
                                onChange={(e) => {
                                  setNewAddressForm(p => ({ ...p, houseNumber: e.target.value }));
                                  if (error) setError('');
                                }}
                                placeholder="e.g. 12A"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Floor</label>
                              <input
                                type="text"
                                value={newAddressForm.floor}
                                onChange={(e) => {
                                  setNewAddressForm(p => ({ ...p, floor: e.target.value }));
                                  if (error) setError('');
                                }}
                                placeholder="e.g. 2"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Society</label>
                            <input
                              type="text"
                              value={newAddressForm.society}
                              onChange={(e) => {
                                setNewAddressForm(p => ({ ...p, society: e.target.value }));
                                if (error) setError('');
                              }}
                              placeholder="e.g. Shanti Nagar"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Address Line *</label>
                            <input
                              type="text"
                              value={newAddressForm.addressLine}
                              onChange={(e) => {
                                setNewAddressForm(p => ({ ...p, addressLine: e.target.value }));
                                if (error) setError('');
                              }}
                              placeholder="House no., Street, Area"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
                              <input
                                type="text"
                                value={newAddressForm.city}
                                onChange={(e) => {
                                  setNewAddressForm(p => ({ ...p, city: e.target.value }));
                                  if (error) setError('');
                                }}
                                placeholder="City"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">State *</label>
                              <input
                                type="text"
                                value={newAddressForm.state}
                                onChange={(e) => {
                                  setNewAddressForm(p => ({ ...p, state: e.target.value }));
                                  if (error) setError('');
                                }}
                                placeholder="State"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Pincode *</label>
                            <input
                              type="text"
                              value={newAddressForm.postalCode}
                              onChange={(e) => {
                                setNewAddressForm(p => ({ ...p, postalCode: e.target.value }));
                                if (error) setError('');
                              }}
                              placeholder="Pincode"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={saveNewAddress}
                              onChange={(e) => setSaveNewAddress(e.target.checked)}
                              className="w-4 h-4 accent-green-600 rounded"
                            />
                            <span className="text-xs text-gray-600 font-medium">
                              Save this address to my profile
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </label>
                </>
              )}
              {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
            </div>
          </div>

          {/* Delivery Notes */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-3">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Delivery Instructions <span className="text-gray-400 font-normal">(Optional)</span></h3>
            </div>
            <div className="px-4 py-3">
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Leave at the door, Ring bell twice, etc."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </form>

        {/* Payment Method */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Payment Method</h3>
          </div>
          <div className="p-3 space-y-2">
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'cod' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')} className="mt-0.5 accent-green-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💵</span>
                  <span className="text-sm font-semibold text-gray-900">Cash on Delivery / UPI on Delivery</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-7">Pay cash or scan UPI QR code when your order arrives.</p>
              </div>
              {paymentMethod === 'cod' && <span className="text-green-600 text-xs font-bold mt-0.5">✓</span>}
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'razorpay' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input type="radio" name="paymentMethod" value="razorpay" checked={paymentMethod === 'razorpay'}
                onChange={() => setPaymentMethod('razorpay')} className="mt-0.5 accent-blue-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💳</span>
                  <span className="text-sm font-semibold text-gray-900">Pay Online</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded">Razorpay</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-7">UPI, Credit/Debit Card, Netbanking — secure & instant.</p>
              </div>
              {paymentMethod === 'razorpay' && <span className="text-blue-600 text-xs font-bold mt-0.5">✓</span>}
            </label>
          </div>
        </div>
      </div>

      {/* Sticky Place Order Button */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <button
          type="submit"
          form="checkout-form"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3.5 rounded-xl text-base transition-colors shadow-lg"
        >
          {loading
            ? 'Processing...'
            : paymentMethod === 'razorpay'
              ? `Pay ₹${total.toFixed(2)} Online`
              : `Place Order · ₹${total.toFixed(2)}`}
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full text-gray-500 text-sm font-medium py-2 mt-1"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
};

export default CheckoutPage;
