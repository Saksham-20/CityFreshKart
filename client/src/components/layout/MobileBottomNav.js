import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiShoppingBag, FiUser } from 'react-icons/fi';
import { useAuthStore } from '../../store/useAuthStore';
import { useCartStore } from '../../store/useCartStore';

/**
 * MobileBottomNav — sticky bottom navigation for minimal PWA
 */
const MobileBottomNav = ({ onCartClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const cartItems = useCartStore((s) => s.items);

  const cartCount = cartItems?.reduce((t, i) => t + (i.quantity || 1), 0) || 0;

  const isActive = (path) => location.pathname === path;

  // Don't show on admin or auth pages
  if (
    location.pathname.startsWith('/admin') ||
    location.pathname === '/login' ||
    location.pathname === '/checkout'
  ) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-white to-gray-50 border-t border-gray-100 safe-area-inset-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around items-center h-16 px-2 sm:px-3">
        
        {/* Products */}
        <Link
          to="/products"
          className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 ${
            isActive('/products') || isActive('/')
              ? 'text-fresh-green-600 bg-fresh-green-50'
              : 'text-gray-600 hover:text-fresh-green-600 hover:bg-fresh-green-50'
          }`}
        >
          <FiHome size={24} strokeWidth={1.5} />
          <span className="text-xs mt-0.5 font-medium">Shop</span>
        </Link>

        {/* Cart */}
        <button
          onClick={onCartClick}
          className="flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 text-gray-600 hover:text-fresh-green-600 hover:bg-fresh-green-50 relative group"
        >
          <FiShoppingBag size={24} strokeWidth={1.5} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md group-hover:scale-110 transition-transform duration-200">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
          <span className="text-xs mt-0.5 font-medium">Cart</span>
        </button>

        {/* Account */}
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 text-gray-600 hover:text-red-600 hover:bg-red-50"
          >
            <FiUser size={24} strokeWidth={1.5} />
            <span className="text-xs mt-0.5 font-medium">Logout</span>
          </button>
        ) : (
          <Link
            to="/login"
            className="flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 text-gray-600 hover:text-fresh-green-600 hover:bg-fresh-green-50"
          >
            <FiUser size={24} strokeWidth={1.5} />
            <span className="text-xs mt-0.5 font-medium">Login</span>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
