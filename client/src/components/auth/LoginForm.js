import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const LoginForm = ({ onSwitchToRegister }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Restrict phone to 10 digits only
    let finalValue = value;
    if (name === 'phone') {
      finalValue = value.replace(/\D/g, '').slice(0, 10);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    setErrors({});
    return true;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const result = await login(formData.phone, formData.password);
      if (result.success) {
        if (result.user && result.user.is_admin) {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }

      setConfirmationResult(result.confirmationResult);
      setStep('otp');
      setOtpExpiry(new Date().getTime() + 5 * 60 * 1000);

      toast.success('OTP sent to your phone!');
    } catch (error) {
      setErrors({
        general: error.message || 'Login failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateOtp = () => {
    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Enter a valid 6-digit OTP' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
    if (errors.otp) setErrors({});
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!validateOtp()) return;

    setIsLoading(true);
    try {
      const result = await verifyOTP(confirmationResult, otp);

      if (!result?.success) {
        setErrors({ general: result?.message || 'Invalid OTP. Please try again.' });
        return;
      }

      toast.success('Logged in successfully!');

      setTimeout(() => {
        if (result.user?.is_admin) {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }, 500);
    } catch (error) {
      console.error('Verify OTP error:', error);
      setErrors({ general: error.message || 'Invalid OTP. Please try again.' });
      toast.error('Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setOtp('');
    setConfirmationResult(null);
    setOtpExpiry(null);
    setErrors({});
  };

  return (
    <div>
      <div className="text-center mb-5">
        <h2 className="text-xl font-bold text-gray-900">Sign In</h2>
        <p className="text-sm text-gray-600 mt-1">Phone & Password</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        {errors.general && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
            {errors.general}
          </div>
        )}
        
        <div>
          <label htmlFor="phone" className="text-sm font-medium text-gray-700 block mb-1">
            Phone Number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            maxLength="10"
            value={formData.phone}
            onChange={handleChange}
            placeholder="8888888888"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-fresh-green"
          />
          {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
        </div>
        
        <div>
          <label htmlFor="password" className="text-sm font-medium text-gray-700 block mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-fresh-green"
          />
          {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-fresh-green hover:bg-fresh-green/90 text-white font-semibold py-2 rounded text-sm transition"
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      
      <div className="mt-3 text-center text-sm">
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-fresh-green hover:underline font-medium"
        >
          Create account
        </button>
      </div>
    </div>
  );
};

export default LoginForm;
