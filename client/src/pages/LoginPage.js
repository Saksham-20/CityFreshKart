import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">CityFreshKart</h1>
          <p className="text-gray-600 text-base">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-6 shadow-2xl rounded-2xl border border-gray-100">
          {isLogin ? (
            <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          <Link to="/" className="text-fresh-green hover:text-fresh-green/80 font-medium">
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
