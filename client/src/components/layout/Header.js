import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiUser, FiShoppingBag, FiX, FiSettings, FiLogOut, FiMapPin, FiChevronDown, FiClock, FiPackage } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);

  const { user, logout } = useAuth();
  const { items: cartItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setShowUserMenu(false);
  }, [location]);

  useEffect(() => {
    const query = new URLSearchParams(location.search).get('search') || '';
    setSearchQuery(query);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      searchRef.current?.blur();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const cartItemCount = cartItems?.length || 0;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-md' : 'bg-white border-b border-gray-100'}`}>
      {/* Top row: logo, location, admin button, user, cart */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center h-14 sm:h-[3.75rem] gap-2 sm:gap-3">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-1.5 max-w-[9.5rem] sm:max-w-none">
            <span className="text-lg sm:text-xl leading-none">🌿</span>
            <span className="text-base sm:text-lg font-extrabold tracking-tight whitespace-nowrap leading-none bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent truncate">
              City<span className="text-gray-900">Fresh</span>Kart
            </span>
          </Link>

          {/* Delivery location chip — desktop only */}
          <button className="hidden lg:flex items-center gap-1 ml-2 text-xs text-gray-600 hover:text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors flex-shrink-0 max-w-[140px]">
            <FiMapPin className="w-3 h-3 text-green-600 flex-shrink-0" />
            <span className="truncate font-medium">Deliver now</span>
            <FiChevronDown className="w-3 h-3 flex-shrink-0 text-gray-400" />
          </button>

          {/* Delivery time badge — desktop */}
          <div className="hidden md:flex items-center gap-1 text-xs text-orange-600 font-bold bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-1.5 flex-shrink-0">
            <FiClock className="w-3 h-3" />
            <span>30 min delivery</span>
          </div>

          {/* Search — full width center */}
          <form onSubmit={handleSearch} className="flex-1 flex items-center relative min-w-0 max-w-[13rem] sm:max-w-none">
            <FiSearch className="absolute left-3 text-gray-400 w-4 h-4 pointer-events-none z-10" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vegetables, fruits..."
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">

            {/* Admin Panel button */}
            {user?.is_admin && (
              <Link
                to="/admin"
                className="hidden sm:flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white pl-2.5 pr-2.5 py-1.5 rounded-lg transition-colors text-xs font-semibold"
                title="Admin Panel"
              >
                <FiSettings className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Admin</span>
              </Link>
            )}

            {/* User dropdown */}
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  aria-label="Account"
                >
                  <FiUser className="w-5 h-5" />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50"
                    >
                      <div className="px-4 py-2.5 border-b border-gray-100">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Signed in as</p>
                        <p className="text-sm font-bold text-gray-900 truncate mt-0.5">{user.name || user.phone}</p>
                      </div>
                      <Link
                        to="/profile"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <FiUser className="w-4 h-4 text-gray-400" />
                        My Profile
                      </Link>
                      <Link
                        to="/orders"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <FiPackage className="w-4 h-4 text-gray-400" />
                        My Orders
                      </Link>
                      {user?.is_admin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <FiSettings className="w-4 h-4 text-gray-400" />
                          Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <FiLogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Cart */}
            <Link
              to="/cart"
              className="relative flex items-center gap-1.5 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 active:scale-[0.97] text-white pl-2.5 sm:pl-3 pr-3 sm:pr-3.5 py-2 rounded-xl transition-all duration-150 text-sm font-bold shadow-md hover:shadow-lg"
              data-testid="cart-icon"
            >
              <FiShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartItemCount > 0 && (
                <span
                  className="bg-white text-green-700 text-[10px] font-extrabold rounded-full w-4 h-4 flex items-center justify-center leading-none"
                  data-testid="cart-badge"
                >
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Link>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
