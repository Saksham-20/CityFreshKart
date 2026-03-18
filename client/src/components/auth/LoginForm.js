import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const LoginForm = ({ onSwitchToRegister }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.general;
      return newErrors;
    });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const result = await login(formData.phone, formData.password);
      if (result?.success) {
        toast.success('Logged in successfully!');
        if (result.user && result.user.is_admin) {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        const message = result?.message || 'Invalid phone or password';
        setErrors({ general: message });
        toast.error(message);
      }
    } catch (error) {
      setErrors({
        general: error.message || 'Login failed'
      });
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
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
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded text-sm transition"
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      
      <div className="mt-4 text-center text-sm">
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-green-600 hover:text-green-800 hover:underline font-medium"
        >
          Don't have an account? Create one
        </button>
      </div>
    </div>
  );
};

export default LoginForm;
