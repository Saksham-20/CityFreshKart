import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiPhone, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const RegisterForm = ({ onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
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
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.general;
      return newErrors;
    });
    return true;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const serverData = {
        name: formData.name,
        phone: formData.phone,
        password: formData.password
      };
      const result = await register(serverData);
      
      if (result?.success) {
        toast.success('Registration successful!');
        navigate('/');
      } else {
        const message = result?.message || 'Registration failed';
        setErrors({ general: message });
        toast.error(message);
      }
    } catch (error) {
      setErrors({ general: error.message || 'Registration failed' });
      toast.error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-extrabold text-gray-900">Create account</h2>
        <p className="text-sm text-gray-500 mt-1">Join thousands of happy customers</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="flex items-start gap-2.5 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm px-4 py-3 rounded-xl">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errors.general}</span>
          </div>
        )}

        <div>
          <label htmlFor="name" className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="John Doe"
              className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-green-500/30 ${
                errors.name ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' : 'border-gray-200 focus:border-green-500'
              }`}
            />
          </div>
          {errors.name && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><FiAlertCircle className="w-3 h-3" />{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
            Phone Number
          </label>
          <div className="relative">
            <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              maxLength="10"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter your 10-digit number"
              className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-green-500/30 ${
                errors.phone ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' : 'border-gray-200 focus:border-green-500'
              }`}
            />
          </div>
          {errors.phone && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><FiAlertCircle className="w-3 h-3" />{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="password" className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
            Password
          </label>
          <div className="relative">
            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Min. 6 characters"
              className={`w-full pl-10 pr-10 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-green-500/30 ${
                errors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' : 'border-gray-200 focus:border-green-500'
              }`}
            />
            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
              {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><FiAlertCircle className="w-3 h-3" />{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Re-enter your password"
              className={`w-full pl-10 pr-10 py-3 border rounded-xl text-sm bg-gray-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-green-500/30 ${
                errors.confirmPassword ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' : 'border-gray-200 focus:border-green-500'
              }`}
            />
            <button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
              {showConfirmPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><FiAlertCircle className="w-3 h-3" />{errors.confirmPassword}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 active:scale-[0.98] text-white font-bold py-3 rounded-xl text-sm transition-all duration-200 shadow-md hover:shadow-lg mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Creating Account...
            </span>
          ) : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin} className="text-green-600 hover:text-green-700 font-semibold hover:underline">
          Sign in
        </button>
      </p>
    </div>
  );
};

export default RegisterForm;
