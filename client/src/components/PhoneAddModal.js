import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const PhoneAddModal = ({ isOpen, onClose, onPhoneAdded, user }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePhoneChange = (e) => {
    const value = String(e.target.value || '')
      .replace(/\D/g, '')
      .slice(0, 10);
    setPhone(value);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!/^\d{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.put('/auth/phone', { phone });

      if (response.data.success) {
        const updatedUser = response.data.data?.user;
        if (updatedUser) {
          // Update user in localStorage
          localStorage.setItem('user', JSON.stringify(updatedUser));
          toast.success('Phone number added successfully!');
          onPhoneAdded(updatedUser);
          setPhone('');
          onClose();
        }
      } else {
        setError(response.data.message || 'Failed to update phone number');
        toast.error(response.data.message || 'Failed to update phone number');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to add phone number';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-xl animate-in slide-in-from-bottom-5 sm:scale-in">
        <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center justify-between">
          <h2 className="text-lg font-headline font-bold text-on-surface">Add Phone Number</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-on-surface-variant p-1 rounded-lg hover:bg-surface-container-high disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <p className="text-sm text-on-surface-variant mb-3">
              We need your phone number so our delivery team can contact you about your order.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="10-digit mobile number"
              maxLength="10"
              disabled={loading}
              autoFocus
              className="w-full px-3 py-3 rounded-lg text-sm bg-surface-container-highest focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/25 ghost-outline-primary disabled:opacity-50"
              required
            />
            <p className="text-xs text-on-surface-variant mt-1">Enter 10 digits without spaces or symbols</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/30">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-medium text-on-surface bg-surface-container-high hover:bg-surface-container disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !/^\d{10}$/.test(phone)}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-medium text-on-primary bg-primary hover:bg-primary-variant disabled:opacity-50 transition-colors"
            >
              {loading ? 'Adding...' : 'Add Phone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PhoneAddModal;
