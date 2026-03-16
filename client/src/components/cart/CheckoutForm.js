import React, { useState } from 'react';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';
import Button from '../ui/Button';
import Input from '../ui/Input';

const CheckoutForm = ({ onSubmit, loading = false }) => {
  const { items: cart, summary } = useCart();
  const { user } = useAuth();
  
  // Calculate total from summary
  const total = summary?.estimated_total || 0;
  const deliveryFee = summary?.delivery_fee || 0;
  const subtotal = summary?.subtotal || 0;
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || user?.email?.split('@')[0] || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    pincode: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  // Format phone number (limit to 10 digits)
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.slice(0, 10);
  };

  const handleInputChange = (field, value) => {
    let formattedValue = value;
    
    // Apply formatting based on field type
    if (field === 'phone') {
      formattedValue = formatPhoneNumber(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.firstName.trim()) newErrors.firstName = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (formData.phone.length !== 10) newErrors.phone = 'Phone must be 10 digits';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.pincode.trim()) newErrors.pincode = 'PIN code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // For City Fresh Kart MVP, payment method is always COD
      onSubmit({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: {
          street: formData.address,
          city: formData.city,
          zipCode: formData.pincode,
          country: 'India'
        },
        paymentMethod: 'cod', // Cash on Delivery only
        notes: formData.notes
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-xl mr-2">👤</span>
          Your Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            error={errors.firstName}
            placeholder="Your name"
            required
          />
          <Input
            label="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            error={errors.phone}
            placeholder="10 digit mobile number"
            maxLength={10}
            required
          />
        </div>
      </div>

      {/* Delivery Address */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-xl mr-2">📍</span>
          Delivery Address
        </h3>
        <div className="space-y-4">
          <Input
            label="Street Address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            error={errors.address}
            placeholder="House number, street name, locality"
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City/Town"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              error={errors.city}
              placeholder="Your city"
              required
            />
            <Input
              label="PIN Code"
              value={formData.pincode}
              onChange={(e) => handleInputChange('pincode', e.target.value)}
              error={errors.pincode}
              placeholder="6 digit PIN code"
              maxLength={6}
              required
            />
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-xl mr-2">📝</span>
          Special Instructions (Optional)
        </h3>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Any special delivery instructions? (e.g., "Ring the bell twice", "Leave at door")
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fresh-green focus:border-fresh-green resize-none text-sm"
          placeholder="Leave your instructions here..."
        />
      </div>

      {/* Payment Info */}
      <div className="bg-fresh-green-light border-2 border-fresh-green p-4 rounded-lg">
        <h3 className="text-base font-bold text-fresh-green mb-2 flex items-center">
          <span className="text-lg mr-2">💰</span>
          Payment Method
        </h3>
        <p className="text-sm text-gray-700">
          <strong>Cash on Delivery (COD)</strong> - Pay when your order arrives. No extra charges!
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-xl mr-2">🛒</span>
          Order Summary
        </h3>
        <div className="space-y-2 text-sm mb-4">
          {(cart || []).map((item) => (
            <div key={`${item.id}-${item.weight || 'default'}`} className="flex justify-between text-gray-700">
              <span className="truncate">
                {item.name}
                {item.weight && ` × ${item.weight}kg`}
                {item.quantity && item.quantity > 1 && ` × ${item.quantity}`}
              </span>
              <span className="font-medium whitespace-nowrap ml-2">
                ₹{((item.price_per_kg || item.price || 0) * (item.weight || 1) * (item.quantity || 1)).toFixed(0)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-300 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(0)}</span>
          </div>
          <div className={`flex justify-between ${deliveryFee === 0 ? 'text-fresh-green font-medium' : 'text-gray-700'}`}>
            <span>Delivery</span>
            <span>{deliveryFee === 0 ? '✓ FREE' : `₹${deliveryFee.toFixed(0)}`}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-300">
            <span>Total Amount</span>
            <span className="text-fresh-green">₹{total.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full bg-fresh-green hover:bg-fresh-green-dark text-white font-bold text-base py-3"
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Processing...
          </span>
        ) : (
          <span>✓ Place Order (COD) - ₹{total.toFixed(0)}</span>
        )}
      </Button>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <span className="text-lg">🔒</span>
          <span>Secure</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg">✅</span>
          <span>Verified</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg">📦</span>
          <span>Quick Delivery</span>
        </div>
      </div>
    </form>
  );
};

export default CheckoutForm;
