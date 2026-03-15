import React from 'react';
import { Link } from 'react-router-dom';
import RegisterForm from '../components/auth/RegisterForm';

const RegisterPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">CityFreshKart</h1>
          <p className="text-gray-600 text-lg">Create your account</p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-8 shadow-2xl rounded-2xl border border-gray-100">
          <RegisterForm />
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

export default RegisterPage;
