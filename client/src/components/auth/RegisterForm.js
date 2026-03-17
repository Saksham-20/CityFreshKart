import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { AUTH_PROVIDER } from '../../services/authProviderService';
import { RECAPTCHA_CONTAINER_ID } from '../../services/authProviders/firebasePhoneAuthProvider';

const RegisterForm = ({ onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { requestOTP, verifyOTP } = useAuthStore();

  // Form states
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Timer for OTP expiry
  useEffect(() => {
    if (!otpExpiry) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const remaining = Math.max(0, Math.ceil((otpExpiry - now) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        setOtpExpiry(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [otpExpiry]);

  const validatePhone = (input) => {
    const digits = input.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      setErrors({ phone: 'Enter a valid 10-digit mobile number' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
    if (errors.phone) setErrors({});
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!validatePhone(phone)) return;

    setIsLoading(true);
    try {
      const result = await requestOTP(`+91${phone}`);

      if (!result?.success) {
        setErrors({ general: result?.message || 'Failed to send OTP. Please try again.' });
        return;
      }

      setUserId(result.userId || result.id);
      setStep('otp');
      setOtpExpiry(new Date().getTime() + 5 * 60 * 1000);

      toast.success('OTP sent to your phone!');
    } catch (error) {
      console.error('Request OTP error:', error);
      setErrors({ general: error.message || 'Failed to send OTP. Please try again.' });
      toast.error('Failed to send OTP');
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
      const result = await verifyOTP(userId, otp);

      if (!result?.success) {
        setErrors({ general: result?.message || 'Invalid OTP. Please try again.' });
        return;
      }

      toast.success('Account created and logged in!');

      setTimeout(() => {
        navigate('/');
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
    setUserId(null);
    setOtpExpiry(null);
    setErrors({});
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <span className="text-3xl">🌿</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {step === 'phone' ? 'Create account' : 'Verify OTP'}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {step === 'phone' 
            ? 'Fresh groceries delivered to your door' 
            : `Enter the OTP sent to +91${phone}`}
        </p>
      </div>

      {/* Error Message */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 mb-4">
          <span>⚠️</span> {errors.general}
        </div>
      )}

      {step === 'phone' ? (
        // STEP 1: Phone Input
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Mobile Number
            </label>
            <div className={`flex rounded-xl border ${errors.phone ? 'border-red-400' : 'border-gray-200'} overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent transition-all`}>
              <span className="flex items-center px-3.5 bg-gray-50 border-r border-gray-200 text-sm font-semibold text-gray-600 select-none whitespace-nowrap">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="98765 43210"
                className="flex-1 px-3 py-3 text-sm outline-none bg-white placeholder-gray-400"
                autoComplete="tel"
                disabled={isLoading}
              />
            </div>
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            <p className="text-xs text-gray-500 mt-2">
              💡 Your account will be created or accessed with this phone number
            </p>
          </div>

          {AUTH_PROVIDER === 'firebase' && (
            <div id={RECAPTCHA_CONTAINER_ID} />
          )}

          <button
            type="submit"
            disabled={isLoading || phone.length !== 10}
            className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 shadow-sm mt-6"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending OTP...
              </>
            ) : 'Send OTP'}
          </button>
        </form>
      ) : (
        // STEP 2: OTP Input
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              6-Digit OTP
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength="6"
              value={otp}
              onChange={handleOtpChange}
              placeholder="000000"
              className={`w-full px-4 py-4 text-lg font-mono text-center tracking-widest rounded-xl border ${errors.otp ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all`}
              disabled={isLoading}
            />
            {errors.otp && <p className="text-red-500 text-xs mt-1">{errors.otp}</p>}
          </div>

          {/* Expiry Timer */}
          {timeLeft > 0 && (
            <div className="text-center text-sm">
              <p className="text-gray-600">
                OTP expires in <span className="font-semibold text-green-600">{timeLeft}s</span>
              </p>
            </div>
          )}

          {timeLeft === 0 && otpExpiry === null && (
            <div className="text-center text-sm">
              <p className="text-red-600 mb-3">OTP expired. Please request a new one.</p>
              <button
                type="button"
                onClick={handleBackToPhone}
                className="text-green-600 hover:text-green-700 font-semibold underline"
              >
                Send new OTP
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 shadow-sm mt-6"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating account...
              </>
            ) : 'Create Account & Login'}
          </button>

          <button
            type="button"
            onClick={handleBackToPhone}
            disabled={isLoading}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors duration-200 mt-3"
          >
            ← Back
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 mt-5">
        Already have an account?{' '}
        <button 
          type="button" 
          onClick={onSwitchToLogin} 
          className="text-green-600 font-semibold hover:underline"
        >
          Sign in
        </button>
      </p>
    </div>
  );
};

export default RegisterForm;
