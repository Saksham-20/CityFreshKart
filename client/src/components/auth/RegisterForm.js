import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Button from '../ui/Button';
import Input from '../ui/Input';

const RegisterForm = ({ onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d+\s\-()]*$/.test(formData.phone) || formData.phone.replace(/\D/g, '').length < 7) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
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
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      // Convert form data to match server expectations
      const serverData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      };
      await register(serverData);
      navigate('/login', { 
        state: { message: 'Registration successful! Please log in to your account.' }
      });
    } catch (error) {
      setErrors({ submit: error.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-fresh-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-fresh-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
        <p className="text-gray-600 text-base">
          Or{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-fresh-green hover:text-fresh-green/80 transition-colors"
          >
            sign in to your existing account
          </button>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {errors.submit}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2 w-full">
                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700">
                  First Name
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  error={errors.firstName}
                  placeholder="Enter your first name"
                  className="h-10 text-sm"
                  fullWidth={true}
                  required
                />
              </div>
              <div className="space-y-2 w-full">
                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700">
                  Last Name
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  error={errors.lastName}
                  placeholder="Enter your last name"
                  className="h-10 text-sm"
                  fullWidth={true}
                  required
                />
              </div>
            </div>

            <div className="space-y-2 w-full">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                placeholder="Enter your email address"
                className="h-10 text-sm"
                fullWidth={true}
                required
              />
            </div>

            <div className="space-y-2 w-full">
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
                Phone Number
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                error={errors.phone}
                placeholder="Enter your phone number"
                className="h-10 text-sm"
                fullWidth={true}
                required
              />
            </div>

            <div className="space-y-2 w-full">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
                placeholder="Enter your password"
                className="h-10 text-sm"
                fullWidth={true}
                required
              />
            </div>

            <div className="space-y-2 w-full">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={errors.confirmPassword}
                placeholder="Confirm your password"
                className="h-10 text-sm"
                fullWidth={true}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-fresh-green hover:bg-fresh-green/90 text-white rounded-lg transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </Button>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-600">
                By creating an account, you agree to our{' '}
                <Link
                  to="/terms"
                  className="text-fresh-green hover:text-fresh-green/80 font-semibold"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  to="/privacy"
                  className="text-fresh-green hover:text-fresh-green/80 font-semibold"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>

            {onSwitchToLogin && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-fresh-green hover:text-fresh-green/80 font-semibold"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </form>
    </div>
  );
};

export default RegisterForm;
