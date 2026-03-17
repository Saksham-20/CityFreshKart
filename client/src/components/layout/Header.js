import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch,
  FiUser,
  FiShoppingBag,
  FiMenu,
  FiX
} from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const searchRef = useRef(null);

  const { user, logout } = useAuth();
  const { items: cartItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setActiveDropdown(null);
  }, [location]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-dropdown]')) setActiveDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      searchRef.current?.blur();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const cartItemCount = cartItems?.reduce((total, item) => total + item.quantity, 0) || 0;

  const navigationItems = [
    { name: 'Vegetables', emoji: '🥦', href: '/products?category=sabzi-greens' },
    { name: 'Fruits', emoji: '🍎', href: '/products?category=fruits' },
    { name: 'Root Veg', emoji: '🥕', href: '/products?category=root-vegetables' },
    { name: 'Exotics & Herbs', emoji: '🌿', href: '/products?category=exotic-herbs' },
    { name: 'Daily Essentials', emoji: '🛒', href: '/products?category=daily-essentials' }
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/97 backdrop-blur-md shadow-medium' : 'bg-white shadow-sm'}`}>
      {/* Top Banner */}
      <div className="bg-fresh-green text-white text-center py-1.5 px-4">
        <p className="text-xs sm:text-sm font-medium">
          🚛 Same-day delivery! Order before 11 AM.{' '}
          <Link to="/products" className="underline hover:no-underline font-semibold">
            Shop Now →
          </Link>
        </p>
      </div>

      {/* Main Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 sm:h-16 gap-3 sm:gap-4">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <motion.span
                className="text-xl sm:text-2xl font-bold text-fresh-green tracking-tight"
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.15 }}
              >
                🥦 CityFreshKart
              </motion.span>
            </Link>

            {/* Search Bar — always visible on desktop, expandable on mobile */}
            <form
              onSubmit={handleSearch}
              className="flex-1 hidden sm:flex items-center relative max-w-xl"
            >
              <FiSearch className="absolute left-3.5 text-gray-400 w-4 h-4 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vegetables, fruits, herbs..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:border-fresh-green focus:ring-2 focus:ring-fresh-green/20 outline-none transition-all duration-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2 ml-auto sm:ml-0">
              {/* Mobile search icon */}
              <button
                onClick={() => navigate('/products')}
                className="sm:hidden p-2 text-gray-600 hover:text-fresh-green transition-colors duration-200"
                aria-label="Search"
              >
                <FiSearch className="w-5 h-5" />
              </button>

              {/* User */}
              {user ? (
                <div className="relative hidden md:block" data-dropdown="user">
                  <button
                    onClick={() => setActiveDropdown(activeDropdown === 'user' ? null : 'user')}
                    className="p-2 text-gray-600 hover:text-fresh-green transition-colors duration-200"
                    aria-label="Account"
                  >
                    <FiUser className="w-5 h-5" />
                  </button>
                  <AnimatePresence>
                    {activeDropdown === 'user' && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-strong border border-gray-100 py-1.5 z-50"
                      >
                        <div className="px-4 py-2 border-b border-gray-100 mb-1">
                          <p className="text-xs text-gray-500">Signed in as</p>
                          <p className="text-sm font-semibold text-gray-900 truncate">{user.name || user.phone}</p>
                        </div>
                        <Link to="/profile" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-fresh-green transition-colors">
                          <FiUser className="w-4 h-4" /> Profile
                        </Link>
                        <Link to="/orders" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-fresh-green transition-colors">
                          <FiShoppingBag className="w-4 h-4" /> My Orders
                        </Link>
                        {user.is_admin && (
                          <Link to="/admin" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-fresh-green transition-colors">
                            <span className="w-4 h-4 text-center">⚙</span> Admin
                          </Link>
                        )}
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden md:flex p-2 text-gray-600 hover:text-fresh-green transition-colors duration-200"
                  aria-label="Login"
                >
                  <FiUser className="w-5 h-5" />
                </Link>
              )}

              {/* Cart */}
              <Link
                to="/cart"
                className="relative flex items-center gap-1.5 bg-fresh-green text-white pl-3 pr-4 py-2 rounded-xl hover:bg-fresh-green-dark transition-colors duration-200 text-sm font-semibold"
                aria-label="Cart"
              >
                <FiShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                {cartItemCount > 0 && (
                  <span className="bg-white text-fresh-green text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none">
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </span>
                )}
              </Link>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-fresh-green transition-colors duration-200"
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMenuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="hidden lg:block border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex justify-center gap-1">
            {navigationItems.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold text-gray-600 hover:text-fresh-green transition-colors duration-200 uppercase tracking-wide whitespace-nowrap"
                >
                  <span>{item.emoji}</span>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-100 bg-white overflow-hidden shadow-medium"
          >
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm outline-none focus:border-fresh-green focus:ring-2 focus:ring-fresh-green/20 transition-all"
                />
              </div>
            </form>

            {/* Mobile Nav Links */}
            <ul className="py-2">
              {navigationItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-fresh-green transition-colors duration-200"
                  >
                    <span className="text-base">{item.emoji}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Mobile Auth Links */}
            <div className="border-t border-gray-100 py-2">
              {user ? (
                <>
                  <div className="px-5 py-2">
                    <p className="text-xs text-gray-500">Signed in as <strong>{user.name || user.email}</strong></p>
                  </div>
                  <Link to="/orders" className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50">
                    <FiShoppingBag className="w-4 h-4" /> My Orders
                  </Link>
                  <Link to="/profile" className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50">
                    <FiUser className="w-4 h-4" /> Profile
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-red-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-2 px-4 py-3">
                  <Link to="/login" className="flex-1 text-center py-2.5 bg-fresh-green text-white rounded-xl text-sm font-semibold hover:bg-fresh-green-dark transition-colors">
                    Login
                  </Link>
                  <Link to="/register" className="flex-1 text-center py-2.5 border border-fresh-green text-fresh-green rounded-xl text-sm font-semibold hover:bg-fresh-green-50 transition-colors">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
