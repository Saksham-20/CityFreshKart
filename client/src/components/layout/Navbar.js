import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiShoppingBag, FiUser } from 'react-icons/fi';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * Navbar — Top navigation with branding, cart, and account icons
 */
const Navbar = ({ onCartClick }) => {
  const navigate = useNavigate();
  const handleCartClick = onCartClick || (() => navigate('/cart'));
  const cartItems = useCartStore((s) => s.items);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const cartCount = cartItems?.reduce((t, i) => t + (i.quantity || 1), 0) || 0;

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-fresh-green-600 to-fresh-green-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg group-hover:bg-white/30 transition-all duration-300">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">CityFreshKart</h1>
              <p className="text-xs text-white/80">Fresh. Farm. Direct.</p>
            </div>
          </Link>

          {/* Desktop Title */}
          <div className="sm:hidden text-center">
            <h1 className="text-base font-bold">CityFreshKart</h1>
          </div>

          {/* Right section: Cart + Account */}
          <div className="flex items-center gap-2">
            {/* Cart Button */}
            <button
              onClick={handleCartClick}
              className="relative flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-all duration-200 px-3 py-2 rounded-lg"
              aria-label="Open cart"
            >
              <FiShoppingBag size={20} />
              <span className="hidden sm:inline text-sm font-medium">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* Account / Login */}
            {isAuthenticated ? (
              <Link
                to="/profile"
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-all duration-200 px-3 py-2 rounded-lg"
              >
                <FiUser size={20} />
                <span className="hidden sm:inline text-sm font-medium">Account</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-all duration-200 px-3 py-2 rounded-lg"
              >
                <FiUser size={20} />
                <span className="hidden sm:inline text-sm font-medium">Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
