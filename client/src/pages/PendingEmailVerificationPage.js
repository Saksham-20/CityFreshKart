import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import useAuth from '../hooks/useAuth';

const PendingEmailVerificationPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const handleResendEmail = async () => {
    try {
      setLoading(true);
      const response = await api.post('/auth/resend-verification-email', {
        email: user?.email,
      });

      if (response.data && response.data.success) {
        setResendSent(true);
        toast.success('Verification email sent! Check your inbox.');
        
        // Reset after 3 seconds
        setTimeout(() => setResendSent(false), 3000);
      } else {
        toast.error(response.data?.message || 'Failed to resend email');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to resend verification email';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Verify Your Email</h1>
        <p className="text-gray-600 text-center mb-6">
          We've sent a verification email to <strong>{user?.email}</strong>. Please click the link in the email to verify your account.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Please check your spam folder if you don't see the email in your inbox.
          </p>
        </div>

        <button
          onClick={handleResendEmail}
          disabled={loading || resendSent}
          className={`w-full py-2 px-4 rounded-lg font-medium transition mb-3 ${
            resendSent
              ? 'bg-green-100 text-green-700 cursor-default'
              : loading
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-orange-600 text-white hover:bg-orange-700'
          }`}
        >
          {loading ? 'Sending...' : resendSent ? '✓ Email Sent' : 'Resend Verification Email'}
        </button>

        <button
          onClick={handleLogout}
          className="w-full py-2 px-4 rounded-lg font-medium border-2 border-gray-300 text-gray-700 hover:border-gray-400 transition"
        >
          Logout
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Email link expires in 24 hours
        </p>
      </div>
    </div>
  );
};

export default PendingEmailVerificationPage;
