import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiPhone, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiMail } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { getSafeReturnPath } from '../../utils/safeReturnPath';
import { firebaseAuth, hasFirebaseClientConfig } from '../../services/firebaseClient';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const LoginForm = ({ onSwitchToRegister }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, forgotPasswordStart, forgotPasswordWithEmail, verifyResetOtp, resetPasswordWithOtp } = useAuth();
  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [resetData, setResetData] = useState({
    phone: '',
    email: '',
    maskedEmail: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
    resetToken: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'phone') finalValue = value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[name];
      delete next.general;
      return next;
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) newErrors.phone = 'Phone must be 10 digits';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Minimum 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const result = await login(formData.phone, formData.password);
      if (result?.success) {
        toast.success('Welcome back!');
        const safe = getSafeReturnPath(location.state?.from?.pathname);
        const defaultPath = result.user?.is_admin ? '/admin' : '/';
        let to = defaultPath;
        if (safe) {
          if (!result.user?.is_admin && safe.startsWith('/admin')) {
            to = '/';
          } else {
            to = safe;
          }
        }
        navigate(to);
      } else {
        const message = result?.message || 'Invalid phone or password';
        setErrors({ general: message });
        toast.error(message);
      }
    } catch (error) {
      setErrors({ general: error.message || 'Login failed' });
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'otp') finalValue = value.replace(/\D/g, '').slice(0, 6);
    if (name === 'phone') finalValue = value.replace(/\D/g, '').slice(0, 10);
    setResetData((prev) => ({ ...prev, [name]: finalValue }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      delete next.general;
      return next;
    });
  };

  const handlePhoneStart = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(resetData.phone)) {
      setErrors({ phone: 'Phone must be 10 digits' });
      return;
    }
    setIsLoading(true);
    try {
      const result = await forgotPasswordStart(resetData.phone);
      if (!result.success) {
        throw new Error(result.message || 'Could not verify phone number');
      }
      setResetData((prev) => ({
        ...prev,
        maskedEmail: result.data?.maskedEmail || '',
      }));
      toast.success(result.message || 'Phone verified');
      setAuthMode('forgotEmail');
    } catch (error) {
      setErrors({ general: error.message || 'Failed to verify phone number' });
      toast.error(error.message || 'Failed to verify phone number');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!resetData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    setIsLoading(true);
    try {
      const result = await forgotPasswordWithEmail(resetData.phone, resetData.email);
      if (!result.success) {
        throw new Error(result.message || 'Could not send OTP');
      }
      toast.success('OTP sent to your email');
      setAuthMode('otp');
    } catch (error) {
      setErrors({ general: error.message || 'Failed to request OTP' });
      toast.error(error.message || 'Failed to request OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!resetData.otp || resetData.otp.length !== 6) {
      setErrors({ otp: 'Enter the 6-digit OTP' });
      return;
    }
    setIsLoading(true);
    try {
      const result = await verifyResetOtp(resetData.phone, resetData.email, resetData.otp);
      if (!result.success || !result.resetToken) {
        throw new Error(result.message || 'Invalid OTP');
      }
      setResetData((prev) => ({ ...prev, resetToken: result.resetToken }));
      toast.success('OTP verified');
      setAuthMode('newPassword');
    } catch (error) {
      setErrors({ general: error.message || 'OTP verification failed' });
      toast.error(error.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!resetData.newPassword) newErrors.newPassword = 'New password is required';
    else if (resetData.newPassword.length < 6) newErrors.newPassword = 'Minimum 6 characters';
    if (resetData.newPassword !== resetData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!resetData.resetToken) newErrors.general = 'Please verify OTP first';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setIsLoading(true);
    try {
      const result = await resetPasswordWithOtp(
        resetData.phone,
        resetData.email,
        resetData.resetToken,
        resetData.newPassword,
      );
      if (!result.success) throw new Error(result.message || 'Password reset failed');
      toast.success('Password reset successful. Please login.');
      setResetData({
        phone: '',
        email: '',
        maskedEmail: '',
        otp: '',
        newPassword: '',
        confirmPassword: '',
        resetToken: '',
      });
      setAuthMode('login');
      setErrors({});
    } catch (error) {
      setErrors({ general: error.message || 'Password reset failed' });
      toast.error(error.message || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!hasFirebaseClientConfig || !firebaseAuth) {
      toast.error('Google login is not configured yet');
      return;
    }
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(firebaseAuth, provider);
      const idToken = await credential.user.getIdToken();
      const result = await loginWithGoogle(idToken);
      if (!result?.success) {
        throw new Error(result?.message || 'Google login failed');
      }
      toast.success('Signed in with Google');
      const safe = getSafeReturnPath(location.state?.from?.pathname);
      const defaultPath = result.user?.is_admin ? '/admin' : '/';
      navigate(safe || defaultPath);
    } catch (error) {
      toast.error(error.message || 'Google sign-in failed');
      setErrors({ general: error.message || 'Google sign-in failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-headline font-extrabold text-on-surface">Welcome back</h2>
        <p className="text-sm text-on-surface-variant mt-1">Sign in to continue shopping</p>
      </div>

      {authMode === 'login' && (
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="flex items-start gap-2.5 bg-error-container/50 border-l-4 border-error text-error text-sm px-4 py-3 rounded-xl">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errors.general}</span>
          </div>
        )}

        <div>
          <label htmlFor="phone" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5">
            Phone Number
          </label>
          <div className="relative">
            <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              maxLength="10"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your 10-digit number"
              className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-surface-container-highest focus:bg-surface-container-lowest transition-all outline-none ghost-outline-primary focus:ring-2 focus:ring-primary/20 ${
                errors.phone ? 'ring-2 ring-error/40' : ''
              }`}
            />
          </div>
          {errors.phone && <p className="text-error text-xs mt-1.5 flex items-center gap-1"><FiAlertCircle className="w-3 h-3" />{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="password" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5">
            Password
          </label>
          <div className="relative">
            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm bg-surface-container-highest focus:bg-surface-container-lowest transition-all outline-none ghost-outline-primary focus:ring-2 focus:ring-primary/20 ${
                errors.password ? 'ring-2 ring-error/40' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-error text-xs mt-1.5 flex items-center gap-1"><FiAlertCircle className="w-3 h-3" />{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-primary to-primary-container hover:opacity-95 active:scale-[0.98] text-on-primary font-bold py-3 rounded-full text-sm transition-all duration-200 shadow-primary-glow mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Signing In...
            </span>
          ) : 'Sign In'}
        </button>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full border border-outline-variant/30 bg-surface-container-highest hover:bg-surface-container text-on-surface font-semibold py-3 rounded-full text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode('forgotPhone');
            setErrors({});
          }}
          className="w-full text-sm text-primary font-semibold hover:underline"
        >
          Forgot password?
        </button>
      </form>
      )}

      {authMode === 'forgotPhone' && (
        <form onSubmit={handlePhoneStart} className="space-y-4">
          {errors.general && <p className="text-error text-sm">{errors.general}</p>}
          <div>
            <label htmlFor="phoneReset" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5">
              Registered Phone
            </label>
            <div className="relative">
              <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              <input
                id="phoneReset"
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength="10"
                value={resetData.phone}
                onChange={handleResetChange}
                placeholder="Enter your 10-digit phone"
                className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-surface-container-highest focus:bg-surface-container-lowest transition-all outline-none ghost-outline-primary focus:ring-2 focus:ring-primary/20 ${
                  errors.phone ? 'ring-2 ring-error/40' : ''
                }`}
              />
            </div>
            {errors.phone && <p className="text-error text-xs mt-1.5">{errors.phone}</p>}
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold py-3 rounded-full text-sm">
            {isLoading ? 'Verifying phone...' : 'Continue'}
          </button>
          <button type="button" onClick={() => setAuthMode('login')} className="w-full text-sm text-primary font-semibold hover:underline">
            Back to login
          </button>
        </form>
      )}

      {authMode === 'forgotEmail' && (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          {errors.general && <p className="text-error text-sm">{errors.general}</p>}
          {resetData.maskedEmail && (
            <p className="text-sm text-on-surface-variant">
              Account email on file: <span className="font-semibold">{resetData.maskedEmail}</span>
            </p>
          )}
          <div>
            <label htmlFor="email" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5">
              Email
            </label>
            <div className="relative">
              <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              <input
                id="email"
                name="email"
                type="email"
                value={resetData.email}
                onChange={handleResetChange}
                placeholder="Enter your email"
                className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-surface-container-highest focus:bg-surface-container-lowest transition-all outline-none ghost-outline-primary focus:ring-2 focus:ring-primary/20 ${
                  errors.email ? 'ring-2 ring-error/40' : ''
                }`}
              />
            </div>
            {errors.email && <p className="text-error text-xs mt-1.5">{errors.email}</p>}
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold py-3 rounded-full text-sm">
            {isLoading ? 'Sending OTP...' : 'Send OTP'}
          </button>
          <button type="button" onClick={() => setAuthMode('forgotPhone')} className="w-full text-sm text-primary font-semibold hover:underline">
            Change phone
          </button>
        </form>
      )}

      {authMode === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          {errors.general && <p className="text-error text-sm">{errors.general}</p>}
          <p className="text-sm text-on-surface-variant">Enter the 6-digit OTP sent to {resetData.email}</p>
          <div>
            <label htmlFor="otp" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5">OTP</label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              maxLength="6"
              value={resetData.otp}
              onChange={handleResetChange}
              placeholder="Enter 6-digit OTP"
              className={`w-full px-4 py-3 rounded-xl text-sm bg-surface-container-highest focus:bg-surface-container-lowest transition-all outline-none ghost-outline-primary focus:ring-2 focus:ring-primary/20 ${
                errors.otp ? 'ring-2 ring-error/40' : ''
              }`}
            />
            {errors.otp && <p className="text-error text-xs mt-1.5">{errors.otp}</p>}
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold py-3 rounded-full text-sm">
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button type="button" onClick={() => setAuthMode('forgotEmail')} className="w-full text-sm text-primary font-semibold hover:underline">
            Change email
          </button>
        </form>
      )}

      {authMode === 'newPassword' && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          {errors.general && <p className="text-error text-sm">{errors.general}</p>}
          <div>
            <label htmlFor="newPassword" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5">
              New Password
            </label>
            <div className="relative">
              <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              <input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={resetData.newPassword}
                onChange={handleResetChange}
                placeholder="Enter new password"
                className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm bg-surface-container-highest focus:bg-surface-container-lowest transition-all outline-none ghost-outline-primary focus:ring-2 focus:ring-primary/20 ${
                  errors.newPassword ? 'ring-2 ring-error/40' : ''
                }`}
              />
              <button type="button" onClick={() => setShowNewPassword((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showNewPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="text-error text-xs mt-1.5">{errors.newPassword}</p>}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={resetData.confirmPassword}
                onChange={handleResetChange}
                placeholder="Confirm new password"
                className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm bg-surface-container-highest focus:bg-surface-container-lowest transition-all outline-none ghost-outline-primary focus:ring-2 focus:ring-primary/20 ${
                  errors.confirmPassword ? 'ring-2 ring-error/40' : ''
                }`}
              />
              <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showConfirmPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-error text-xs mt-1.5">{errors.confirmPassword}</p>}
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold py-3 rounded-full text-sm">
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
          <button type="button" onClick={() => setAuthMode('login')} className="w-full text-sm text-primary font-semibold hover:underline">
            Back to login
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        New here?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-primary font-semibold hover:underline"
        >
          Create an account
        </button>
      </p>
    </div>
  );
};

export default LoginForm;
