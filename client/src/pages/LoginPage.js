import React, { useState } from 'react';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { getSafeReturnPath } from '../utils/safeReturnPath';

const TRUST_FEATURES = [
  { icon: '🌱', title: 'Farm-to-Door Freshness', desc: 'Sourced directly from local farms every morning' },
  { icon: '⚡', title: '30-Minute Delivery', desc: 'Lightning-fast delivery right to your doorstep' },
  { icon: '🚚', title: 'Free Delivery over ₹300', desc: 'No hidden charges, ever' },
];

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (isAuthenticated) {
    const safe = getSafeReturnPath(location.state?.from?.pathname);
    const defaultPath = user?.is_admin ? '/admin' : '/';
    let to = defaultPath;
    if (safe) {
      if (!user?.is_admin && safe.startsWith('/admin')) {
        to = '/';
      } else {
        to = safe;
      }
    }
    return <Navigate to={to} replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Hero Panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 relative overflow-hidden bg-gradient-to-br from-green-800 via-green-600 to-emerald-500 flex-col justify-between p-12">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -right-16 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-green-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center text-2xl shadow-lg backdrop-blur-sm">
              🌿
            </div>
            <span className="text-white text-2xl font-extrabold tracking-tight">CityFreshKart</span>
          </div>
          <p className="text-green-100 text-sm font-medium">India's freshest vegetables, delivered in 30 minutes.</p>
        </div>

        {/* Central illustration */}
        <div className="relative z-10 flex flex-col items-center text-center py-8">
          <div className="text-8xl mb-6 drop-shadow-lg select-none">🥬</div>
          <h2 className="text-white text-3xl font-extrabold leading-tight mb-3">
            Khet Se<br />Aapki Thali Tak
          </h2>
          <p className="text-green-100 text-sm max-w-xs leading-relaxed">
            Farm-fresh vegetables and fruits delivered to your doorstep. Same-day delivery — order before 11 AM!
          </p>
        </div>

        {/* Trust features */}
        <div className="relative z-10 space-y-3">
          {TRUST_FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
              <span className="text-xl flex-shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <p className="text-white text-sm font-semibold">{f.title}</p>
                <p className="text-green-100 text-xs mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white px-6 py-12 sm:px-12">
        {/* Mobile brand header */}
        <div className="flex lg:hidden flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg mb-3">
            🌿
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">CityFreshKart</h1>
          <p className="text-green-600 text-sm mt-1 font-medium">Farm-fresh, delivered in 30 min</p>
        </div>

        <div className="w-full max-w-sm">
          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-8 gap-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                isLogin
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                !isLogin
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Create Account
            </button>
          </div>

          {isLogin ? (
            <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>

        <p className="mt-10 text-xs text-gray-400 text-center max-w-xs">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
