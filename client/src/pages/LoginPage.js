import React, { useState } from 'react';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { getSafeReturnPath } from '../utils/safeReturnPath';
import { FiCheckCircle, FiClock, FiTruck } from 'react-icons/fi';

const TRUST_FEATURES = [
  { icon: FiCheckCircle, title: 'Farm-to-Door Freshness', desc: 'Sourced directly from local farms every morning' },
  { icon: FiClock, title: '30-Minute Delivery', desc: 'Lightning-fast delivery right to your doorstep' },
  { icon: FiTruck, title: 'Free Delivery over ₹300', desc: 'No hidden charges, ever' },
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
    <div className="min-h-screen flex bg-surface">
      {/* Left Hero Panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-container flex-col justify-between p-12 text-on-primary">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -right-16 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-green-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl font-headline font-extrabold tracking-tight">CityFreshKart</span>
          </div>
          <p className="text-on-primary/90 text-sm font-medium">India&apos;s freshest produce, delivered in 30 minutes.</p>
        </div>

        {/* Central illustration */}
        <div className="relative z-10 flex flex-col items-center text-center py-8">
          <img src="/CityFreshKart.png" alt="CityFreshKart" className="h-44 w-auto mb-6 drop-shadow-lg select-none" />
          <h2 className="text-white text-3xl font-extrabold leading-tight mb-3">
            Khet Se<br />Aapki Thali Tak
          </h2>
          <p className="text-on-primary/85 text-sm max-w-xs leading-relaxed">
            Farm-fresh vegetables and fruits delivered to your doorstep. Same-day delivery — order before 11 AM!
          </p>
        </div>

        {/* Trust features */}
        <div className="relative z-10 space-y-3">
          {TRUST_FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
              <f.icon className="text-lg flex-shrink-0 mt-0.5 text-white" />
              <div>
                <p className="text-white text-sm font-semibold">{f.title}</p>
                <p className="text-on-primary/80 text-xs mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center bg-surface px-6 py-12 sm:px-12">
        {/* Mobile brand header */}
        <div className="flex lg:hidden flex-col items-center mb-8">
          <img src="/CityFreshKart.png" alt="CityFreshKart" className="h-20 w-auto object-contain mb-3" />
          <h1 className="text-2xl font-headline font-extrabold text-on-surface">CityFreshKart</h1>
          <p className="text-primary text-sm mt-1 font-medium">Farm-fresh, delivered in 30 min</p>
        </div>

        <div className="w-full max-w-sm">
          {/* Tab switcher */}
          <div className="flex bg-surface-container-low rounded-2xl p-1 mb-8 gap-1 outline outline-1 outline-outline-variant/10">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                isLogin
                  ? 'bg-surface-container-lowest text-on-surface shadow-editorial'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                !isLogin
                  ? 'bg-surface-container-lowest text-on-surface shadow-editorial'
                  : 'text-on-surface-variant hover:text-on-surface'
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

        <p className="mt-10 text-xs text-on-surface-variant text-center max-w-xs">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
