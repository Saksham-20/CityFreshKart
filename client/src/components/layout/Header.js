import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiShoppingBag, FiX, FiSettings, FiLogOut, FiMapPin, FiChevronDown, FiClock, FiPackage, FiDownload } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import InstallAppModal from '../pwa/InstallAppModal';
import { isAppInstalled, isStandaloneDisplayMode } from '../../utils/pwa';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);

  const canShowInstallApp = !isAppInstalled() && !isStandaloneDisplayMode();

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
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      searchRef.current?.blur();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const cartItemCount = cartItems?.length || 0;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 glass-header ${
        isScrolled ? 'shadow-editorial' : ''
      }`}
    >
      {/* Top row: logo, location, admin button, user, cart */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center h-14 sm:h-[3.75rem] gap-2 sm:gap-3">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-1 max-w-[9.5rem] sm:max-w-none">
            <span className="material-symbols-outlined text-primary text-2xl" aria-hidden>eco</span>
            <span className="text-base sm:text-lg font-headline font-extrabold tracking-tight text-on-surface truncate">
              CityFreshKart
            </span>
          </Link>

          {/* Delivery location chip — desktop only */}
          <button
            type="button"
            className="hidden lg:inline-flex items-center gap-2 ml-1 text-left bg-surface-container-low hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors flex-shrink-0 max-w-[160px] outline outline-1 outline-outline-variant/20"
          >
            <FiMapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="flex flex-col min-w-0 leading-tight">
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Deliver now</span>
              <span className="text-xs font-semibold text-on-surface truncate">Your area</span>
            </span>
            <FiChevronDown className="w-3 h-3 flex-shrink-0 text-on-surface-variant" />
          </button>

          {/* Delivery time badge — desktop */}
          <div className="hidden md:flex items-center gap-1 text-[11px] text-on-secondary-container font-bold bg-secondary-container/40 rounded-full px-2.5 py-1 flex-shrink-0">
            <FiClock className="w-3 h-3 text-secondary" />
            <span>30 min</span>
          </div>

          {/* Search — full width center */}
          <form onSubmit={handleSearch} className="flex-1 flex items-center relative min-w-0 max-w-[13rem] sm:max-w-none">
            <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-xl pointer-events-none z-10" aria-hidden>search</span>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vegetables, fruits..."
              className="w-full pl-10 pr-8 py-2 rounded-xl bg-surface-container-highest text-sm text-on-surface placeholder-on-surface-variant focus:bg-surface-container-lowest ghost-outline-primary outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-on-surface-variant hover:text-on-surface"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">

            {user && canShowInstallApp && (
              <button
                type="button"
                onClick={() => setShowInstallModal(true)}
                className="flex p-2 text-on-surface-variant hover:text-primary hover:bg-secondary-container/30 rounded-xl transition-colors"
                title="Install app"
                aria-label="Install app"
              >
                <FiDownload className="w-5 h-5" />
              </button>
            )}

            {/* Admin Panel button */}
            {user?.is_admin && (
              <Link
                to="/admin"
                className="hidden sm:flex items-center gap-1.5 bg-inverse-surface hover:opacity-90 text-inverse-on-surface pl-2.5 pr-2.5 py-1.5 rounded-lg transition-colors text-xs font-semibold"
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
                  className="p-2 text-on-surface-variant hover:text-primary hover:bg-secondary-container/30 rounded-xl transition-colors"
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
                      className="absolute right-0 mt-1 w-48 bg-surface-container-lowest rounded-2xl shadow-editorial outline outline-1 outline-outline-variant/15 py-1.5 z-50"
                    >
                      <div className="px-4 py-2.5 border-b border-surface-container">
                        <p className="text-[11px] text-on-surface-variant uppercase tracking-wide">Signed in as</p>
                        <p className="text-sm font-bold text-on-surface truncate mt-0.5">{user.name || user.phone}</p>
                      </div>
                      <Link
                        to="/profile"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                      >
                        <FiUser className="w-4 h-4 text-on-surface-variant" />
                        My Profile
                      </Link>
                      <Link
                        to="/orders"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                      >
                        <FiPackage className="w-4 h-4 text-on-surface-variant" />
                        My Orders
                      </Link>
                      {user?.is_admin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                        >
                          <FiSettings className="w-4 h-4 text-on-surface-variant" />
                          Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-surface-container mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-error hover:bg-error-container/30 transition-colors"
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
              className="relative flex items-center gap-1.5 bg-gradient-to-r from-primary to-primary-container hover:opacity-95 active:scale-[0.97] text-on-primary pl-2.5 sm:pl-3 pr-3 sm:pr-3.5 py-2 rounded-full transition-all duration-150 text-sm font-bold shadow-primary-glow"
              data-testid="cart-icon"
            >
              <FiShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartItemCount > 0 && (
                <span
                  className="bg-on-primary text-primary text-[10px] font-extrabold rounded-full min-w-[1rem] h-4 px-0.5 flex items-center justify-center leading-none"
                  data-testid="cart-badge"
                >
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Link>
          </div>

        </div>
      </div>

      <InstallAppModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </header>
  );
};

export default Header;
