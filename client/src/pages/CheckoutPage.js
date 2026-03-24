import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { razorpayService } from '../services/razorpayService';
import { addressService } from '../services/addressService';
import toast from 'react-hot-toast';
import { formatCartQuantityLabel, resolveBasePriceForWeight } from '../utils/weightSystem';

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
    addressLine: '',
    society: '',
    sector: '',
  });
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [orderPhone, setOrderPhone] = useState(String(user?.phone || '').replace(/\D/g, '').slice(0, 10));
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
    if (String(newAddressForm.houseNumber || '').trim().length > 100) return 'House number is too long';
    if (String(newAddressForm.addressLine || '').trim().length < 5) return 'Address line is too short';
    return '';
  };

  const getDeliveryAddress = () => {
    if (useNewAddress) {
      const { houseNumber, addressLine } = newAddressForm;
      const ready = houseNumber && addressLine;
      if (!ready) return '';

      return addressService.formatAddressText({
        house_number: newAddressForm.houseNumber,
        floor: newAddressForm.floor,
        address_line: newAddressForm.addressLine,
        society: newAddressForm.society,
        sector: newAddressForm.sector,
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
      phone: orderPhone,
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
    if (!/^\d{10}$/.test(String(orderPhone || '').trim())) {
      setError('Please enter a valid 10-digit phone number for this order');
      return;
    }

    setLoading(true);
    setError('');

    // Save new address to profile if checkbox is ticked
    if (useNewAddress && saveNewAddress && address) {
      try {
        await addressService.addAddress({
          houseNumber: newAddressForm.houseNumber,
          floor: newAddressForm.floor,
          addressLine: newAddressForm.addressLine,
          isDefault: savedAddresses.length === 0,
        });
        toast.success('Address saved to your profile!');
        // Refresh addresses silently so future visits are pre-filled
        loadAddresses();
      } catch (saveErr) {
        // Don't block order placement, but clearly inform the user.
        toast.error(
          saveErr?.response?.data?.error?.message
          || saveErr?.response?.data?.message
          || 'Could not save this address to profile. Order will still be placed.',
        );
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
    <div className="min-h-screen bg-surface pt-14 pb-[10.5rem]">
      {/* Header */}
      <div className="glass-header border-b border-outline-variant/10 px-4 py-3 flex items-center gap-3 sticky top-14 z-10">
        <button type="button" onClick={() => navigate('/cart')} className="text-on-surface-variant p-1 -ml-1 rounded-lg hover:bg-surface-container-low">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-headline font-bold text-on-surface">Checkout</h1>
      </div>

      <div className="max-w-lg mx-auto px-3 sm:px-4 pt-3 sm:pt-4 space-y-3">
        {/* Order Summary */}
        <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 overflow-hidden shadow-editorial">
          <div className="px-4 py-3 border-b border-surface-container">
            <h3 className="font-semibold text-on-surface text-sm">Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})</h3>
          </div>
          <div className="px-4 py-3 space-y-2">
            {items.map(item => {
              const itemPrice = item.discount
                ? resolveBasePriceForWeight(item.price_per_kg, item.quantity, item.weight_price_overrides || {}) * (1 - item.discount / 100)
                : resolveBasePriceForWeight(item.price_per_kg, item.quantity, item.weight_price_overrides || {});
              return (
                <div key={item.id} className="flex justify-between text-sm text-on-surface-variant">
                  <span className="flex-1 pr-2">{item.name} × {formatCartQuantityLabel(item)}</span>
                  <span className="font-medium text-on-surface">₹{itemPrice.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-surface-container px-4 py-3 space-y-2">
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-on-surface-variant">
              <span>Delivery {subtotal >= 300 ? '(FREE)' : ''}</span>
              <span className={deliveryFee === 0 ? 'text-primary font-medium' : ''}>
                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
              </span>
            </div>
            {subtotal < 300 && (
              <p className="text-xs text-primary">Add ₹{(300 - subtotal).toFixed(2)} more for free delivery</p>
            )}
            <div className="flex justify-between font-bold text-on-surface border-t border-surface-container pt-2">
              <span>Total</span>
              <span className="text-primary">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <form onSubmit={handleOrderSubmit} id="checkout-form">
          <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 overflow-hidden mb-3 shadow-editorial">
            <div className="px-4 py-3 border-b border-surface-container">
              <h3 className="font-semibold text-on-surface text-sm">Contact Number for Order</h3>
            </div>
            <div className="px-4 py-3">
              <input
                type="tel"
                value={orderPhone}
                onChange={(e) => {
                  setOrderPhone(String(e.target.value || '').replace(/\D/g, '').slice(0, 10));
                  if (error) setError('');
                }}
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2 rounded-lg text-sm bg-surface-container-highest focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/25 ghost-outline-primary"
                required
              />
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 overflow-hidden shadow-editorial">
            <div className="px-4 py-3 border-b border-surface-container flex items-center justify-between">
              <h3 className="font-semibold text-on-surface text-sm">Delivery Address</h3>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="text-xs text-primary hover:underline font-medium"
              >
                Manage Addresses
              </button>
            </div>
            <div className="px-4 py-3 space-y-3">
              {addressesLoading ? (
                <p className="text-sm text-on-surface-variant">Loading saved addresses...</p>
              ) : (
                <>
                  {/* Saved address radio cards */}
                  {savedAddresses.map(addr => (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-3 p-3 rounded-xl outline outline-2 cursor-pointer transition-all ${
                        !useNewAddress && selectedAddressId === addr.id
                          ? 'outline-primary bg-secondary-container/25'
                          : 'outline-outline-variant/20 bg-surface-container-lowest hover:outline-primary/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryAddress"
                        checked={!useNewAddress && selectedAddressId === addr.id}
                        onChange={() => { setSelectedAddressId(addr.id); setUseNewAddress(false); if (error) setError(''); }}
                        className="mt-0.5 accent-primary"
                      />
                      <div className="flex-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-on-surface">Saved Address</span>
                          {addr.is_default && (
                            <span className="text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded font-semibold">Default</span>
                          )}
                        </div>
                        <p className="text-on-surface-variant mt-0.5">
                          {addressService.formatAddressText(addr)}
                        </p>
                      </div>
                      {!useNewAddress && selectedAddressId === addr.id && (
                        <span className="text-primary text-xs font-bold mt-0.5">✓</span>
                      )}
                    </label>
                  ))}

                  {/* Use new address option */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl outline outline-2 cursor-pointer transition-all ${
                      useNewAddress ? 'outline-primary bg-secondary-container/25' : 'outline-outline-variant/20 bg-surface-container-lowest hover:outline-primary/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryAddress"
                      checked={useNewAddress}
                      onChange={() => { setUseNewAddress(true); if (error) setError(''); }}
                      className="mt-0.5 accent-primary"
                    />
                    <div className="flex-1 text-sm">
                      <span className="font-semibold text-on-surface">
                        {savedAddresses.length > 0 ? '+ Use a different address' : 'Enter delivery address'}
                      </span>
                      {useNewAddress && (
                        <div className="mt-2 space-y-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-on-surface-variant mb-1">House Number *</label>
                              <input
                                type="text"
                                value={newAddressForm.houseNumber}
                                onChange={(e) => {
                                  setNewAddressForm(p => ({ ...p, houseNumber: e.target.value }));
                                  if (error) setError('');
                                }}
                                placeholder="e.g. 12A"
                                className="w-full px-3 py-2 rounded-lg text-sm bg-surface-container-highest focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/25 ghost-outline-primary"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-on-surface-variant mb-1">Floor</label>
                              <input
                                type="text"
                                value={newAddressForm.floor}
                                onChange={(e) => {
                                  setNewAddressForm(p => ({ ...p, floor: e.target.value }));
                                  if (error) setError('');
                                }}
                                placeholder="e.g. 2"
                                className="w-full px-3 py-2 rounded-lg text-sm bg-surface-container-highest focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/25 ghost-outline-primary"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-on-surface-variant mb-1">Address Line *</label>
                            <input
                              type="text"
                              value={newAddressForm.addressLine}
                              onChange={(e) => {
                                setNewAddressForm(p => ({ ...p, addressLine: e.target.value }));
                                if (error) setError('');
                              }}
                              placeholder="House no., Street, Area"
                              className="w-full px-3 py-2 rounded-lg text-sm bg-surface-container-highest focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/25 ghost-outline-primary"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-on-surface-variant mb-1">Society</label>
                              <input
                                type="text"
                                value={newAddressForm.society}
                                onChange={(e) => {
                                  setNewAddressForm(p => ({ ...p, society: e.target.value }));
                                  if (error) setError('');
                                }}
                                placeholder="Society / building"
                                className="w-full px-3 py-2 rounded-lg text-sm bg-surface-container-highest focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/25 ghost-outline-primary"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-on-surface-variant mb-1">Sector</label>
                              <input
                                type="text"
                                value={newAddressForm.sector}
                                onChange={(e) => {
                                  setNewAddressForm(p => ({ ...p, sector: e.target.value }));
                                  if (error) setError('');
                                }}
                                placeholder="Sector"
                                className="w-full px-3 py-2 rounded-lg text-sm bg-surface-container-highest focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/25 ghost-outline-primary"
                              />
                            </div>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={saveNewAddress}
                              onChange={(e) => setSaveNewAddress(e.target.checked)}
                              className="w-4 h-4 accent-primary rounded"
                            />
                            <span className="text-xs text-on-surface-variant font-medium">
                              Save this address to my profile
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </label>
                </>
              )}
              {error && <p className="text-error text-xs mt-1">{error}</p>}
            </div>
          </div>

          {/* Delivery Notes */}
          <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 overflow-hidden mt-3 shadow-editorial">
            <div className="px-4 py-3 border-b border-surface-container">
              <h3 className="font-semibold text-on-surface text-sm">Delivery Instructions <span className="text-on-surface-variant font-normal">(Optional)</span></h3>
            </div>
            <div className="px-4 py-3">
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Leave at the door, Ring bell twice, etc."
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 resize-none bg-surface-container-highest focus:bg-surface-container-lowest transition-colors ghost-outline-primary"
              />
            </div>
          </div>
        </form>

        {/* Payment Method */}
        <div className="bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/15 overflow-hidden shadow-editorial">
          <div className="px-4 py-3 border-b border-surface-container">
            <h3 className="font-semibold text-on-surface text-sm">Payment Method</h3>
          </div>
          <div className="p-3 space-y-2">
            <label
              className={`flex items-start gap-3 p-3 rounded-xl outline outline-2 cursor-pointer transition-all ${
                paymentMethod === 'cod' ? 'outline-primary bg-secondary-container/25' : 'outline-outline-variant/20 bg-surface-container-lowest hover:outline-primary/30'
              }`}
            >
              <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')} className="mt-0.5 accent-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💵</span>
                  <span className="text-sm font-semibold text-on-surface">Cash on Delivery / UPI on Delivery</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5 ml-7">Pay cash or scan UPI QR code when your order arrives.</p>
              </div>
              {paymentMethod === 'cod' && <span className="text-primary text-xs font-bold mt-0.5">✓</span>}
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-xl outline outline-2 cursor-pointer transition-all ${
                paymentMethod === 'razorpay' ? 'outline-primary bg-secondary-container/25' : 'outline-outline-variant/20 bg-surface-container-lowest hover:outline-primary/30'
              }`}
            >
              <input type="radio" name="paymentMethod" value="razorpay" checked={paymentMethod === 'razorpay'}
                onChange={() => setPaymentMethod('razorpay')} className="mt-0.5 accent-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💳</span>
                  <span className="text-sm font-semibold text-on-surface">Pay Online</span>
                  <span className="text-[10px] bg-surface-container text-primary font-semibold px-1.5 py-0.5 rounded outline outline-1 outline-outline-variant/20">Razorpay</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5 ml-7">UPI, Credit/Debit Card, Netbanking — secure & instant.</p>
              </div>
              {paymentMethod === 'razorpay' && <span className="text-primary text-xs font-bold mt-0.5">✓</span>}
            </label>
          </div>
        </div>
      </div>

      {/* Sticky Place Order Button */}
      <div
        className="fixed bottom-0 left-0 right-0 glass-header border-t border-outline-variant/10 p-4 z-40"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <button
          type="submit"
          form="checkout-form"
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary to-primary-container hover:opacity-95 disabled:opacity-40 text-on-primary font-bold py-3.5 rounded-full text-base transition-opacity shadow-primary-glow"
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
          className="w-full text-on-surface-variant text-sm font-medium py-2 mt-1"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
};

export default CheckoutPage;
