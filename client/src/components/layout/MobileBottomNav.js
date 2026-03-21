import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiShoppingBag, FiList, FiUser } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';

/**
 * MobileBottomNav — sticky bottom navigation bar for PWA / mobile
 */
const MobileBottomNav = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { items: cartItems } = useCart();

  const cartCount = cartItems?.length || 0;

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  // Don't show on admin or auth pages
  if (
    location.pathname.startsWith('/admin') ||
    location.pathname === '/login' ||
    location.pathname === '/cart' ||
    location.pathname === '/checkout'
  ) {
    return null;
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-header border-t border-outline-variant/10 shadow-[0_-8px_32px_-4px_rgba(0,108,73,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around items-center h-[4.5rem] px-2">

        {/* Shop */}
        <Link
          to="/"
          className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
            location.pathname === '/'
              ? 'text-primary bg-secondary-container/35'
              : 'text-on-surface-variant hover:text-primary hover:bg-secondary-container/20'
          }`}
        >
          <FiHome size={21} strokeWidth={location.pathname === '/' ? 2.5 : 1.75} />
          <span className="text-xs mt-0.5 font-medium">Shop</span>
        </Link>

        {/* Cart */}
        <Link
          to="/cart"
          className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 relative ${
            isActive('/cart')
              ? 'text-primary bg-secondary-container/35'
              : 'text-on-surface-variant hover:text-primary hover:bg-secondary-container/20'
          }`}
        >
          <div className="relative">
            <FiShoppingBag size={21} strokeWidth={isActive('/cart') ? 2.5 : 1.75} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-0.5 font-medium">Cart</span>
        </Link>

        {/* Orders */}
        <Link
          to="/orders"
          className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
            isActive('/orders')
              ? 'text-primary bg-secondary-container/35'
              : 'text-on-surface-variant hover:text-primary hover:bg-secondary-container/20'
          }`}
        >
          <FiList size={21} strokeWidth={isActive('/orders') ? 2.5 : 1.75} />
          <span className="text-xs mt-0.5 font-medium">Orders</span>
        </Link>

        {/* Account / Profile */}
        <Link
          to={isAuthenticated ? '/profile' : '/login'}
          className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
            isActive('/profile')
              ? 'text-primary bg-secondary-container/35'
              : 'text-on-surface-variant hover:text-primary hover:bg-secondary-container/20'
          }`}
        >
          <FiUser size={21} strokeWidth={isActive('/profile') ? 2.5 : 1.75} />
          <span className="text-xs mt-0.5 font-medium">{isAuthenticated ? 'Profile' : 'Login'}</span>
        </Link>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
