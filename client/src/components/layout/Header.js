import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiShoppingBag, FiX, FiSettings, FiLogOut, FiMapPin, FiChevronDown, FiClock, FiPackage, FiDownload, FiSearch } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import InstallAppModal from '../pwa/InstallAppModal';
import { isAppInstalled, isStandaloneDisplayMode } from '../../utils/pwa';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';
import Modal from '../ui/Modal';

const searchInputClass =
  'w-full min-h-[44px] pl-10 pr-10 py-2.5 rounded-xl bg-surface-container-highest text-base sm:text-sm text-on-surface placeholder-on-surface-variant focus:bg-surface-container-lowest ghost-outline-primary outline-none transition-all';

function SearchPanel({
  searchQuery,
  setSearchQuery,
  onSubmit,
  onClear,
  suggestions,
  searchLoading,
  showDropdown,
  setShowDropdown,
  onPickSuggestion,
  inputRef,
  containerRef,
  embedded = false,
}) {
  const dropdownPosition = embedded
    ? 'relative mt-2 max-h-[min(50vh,20rem)] overflow-y-auto rounded-2xl bg-surface-container-lowest shadow-editorial outline outline-1 outline-outline-variant/20 py-1 z-[70]'
    : 'absolute left-0 right-0 top-full mt-1 max-h-[min(70vh,22rem)] overflow-y-auto rounded-2xl bg-surface-container-lowest shadow-editorial outline outline-1 outline-outline-variant/20 py-1 z-[70]';

  return (
    <div ref={containerRef} className="w-full relative z-[60]">
      <form onSubmit={onSubmit} className="w-full relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl pointer-events-none z-10" aria-hidden>search</span>
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => searchQuery.trim().length >= 2 && setShowDropdown(true)}
          placeholder="Search fruits & vegetables…"
          className={searchInputClass}
          aria-label="Search products"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1"
            aria-label="Clear search"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
        <AnimatePresence>
          {showDropdown && (suggestions.length > 0 || searchLoading) && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className={dropdownPosition}
            >
              {searchLoading && suggestions.length === 0 && (
                <div className="px-4 py-3 text-sm text-on-surface-variant">Searching…</div>
              )}
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPickSuggestion(p)}
                  className="w-full flex items-center gap-3 min-h-12 px-3 py-2.5 text-left hover:bg-surface-container-low transition-colors"
                >
                  <img
                    src={getImageUrl(p.image_url)}
                    alt=""
                    className="w-11 h-11 rounded-xl object-cover bg-surface-container flex-shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-on-surface truncate">{p.name}</span>
                    <span className="text-xs font-bold text-primary">
                      ₹{Number(p.price_per_kg || 0).toFixed(0)}/{p.pricing_type === 'per_piece' ? 'pc' : 'kg'}
                    </span>
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRefDesktop = useRef(null);
  const searchRefMobile = useRef(null);
  const desktopSearchWrapRef = useRef(null);
  const mobileModalSearchRef = useRef(null);
  const userMenuRef = useRef(null);

  const debouncedSearch = useDebounce(searchQuery, 280);

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
      const inDesktop = desktopSearchWrapRef.current?.contains(e.target);
      const inMobileModal = mobileModalSearchRef.current?.contains(e.target);
      if (!inDesktop && !inMobileModal) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const q = debouncedSearch.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setSearchLoading(true);
        const res = await api.get(`/products/search?q=${encodeURIComponent(q)}&limit=8`);
        const list = res.data?.data?.products || [];
        if (!cancelled) {
          setSuggestions(Array.isArray(list) ? list : []);
          setShowDropdown(true);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length >= 2) {
      navigate(`/?search=${encodeURIComponent(q)}`);
      setShowDropdown(false);
      setShowMobileSearch(false);
      searchRefDesktop.current?.blur();
      searchRefMobile.current?.blur();
    }
  };

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    navigate('/', { replace: true });
  }, [navigate]);

  const pickSuggestion = (product) => {
    const q = searchQuery.trim() || product.name || '';
    navigate(`/?highlight=${encodeURIComponent(product.id)}&search=${encodeURIComponent(q)}`);
    setShowDropdown(false);
    setShowMobileSearch(false);
    searchRefDesktop.current?.blur();
    searchRefMobile.current?.blur();
  };

  useEffect(() => {
    if (!showMobileSearch) return;
    const t = window.setTimeout(() => searchRefMobile.current?.focus(), 200);
    return () => window.clearTimeout(t);
  }, [showMobileSearch]);

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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:items-center md:h-[3.75rem] py-2 md:py-0">
          <div className="flex items-center gap-2 sm:gap-3 min-h-[3.25rem] md:min-h-0 md:flex-1 md:min-w-0">
            <Link to="/" className="flex-shrink-0 flex items-center gap-1 max-w-[8rem] sm:max-w-[9.5rem] sm:max-w-none">
              <span className="material-symbols-outlined text-primary text-2xl" aria-hidden>eco</span>
              <span className="text-base sm:text-lg font-headline font-extrabold tracking-tight text-on-surface truncate">
                CityFreshKart
              </span>
            </Link>

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

            <div className="hidden md:flex items-center gap-1 text-[11px] text-on-secondary-container font-bold bg-secondary-container/40 rounded-full px-2.5 py-1 flex-shrink-0">
              <FiClock className="w-3 h-3 text-secondary" />
              <span>30 min</span>
            </div>

            <div className="hidden md:block flex-1 min-w-0">
              <SearchPanel
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSubmit={handleSearch}
                onClear={clearSearch}
                suggestions={suggestions}
                searchLoading={searchLoading}
                showDropdown={showDropdown}
                setShowDropdown={setShowDropdown}
                onPickSuggestion={pickSuggestion}
                inputRef={searchRefDesktop}
                containerRef={desktopSearchWrapRef}
              />
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 ml-auto md:ml-0">
              <button
                type="button"
                className="md:hidden flex p-2.5 min-w-[44px] min-h-[44px] items-center justify-center text-on-surface-variant hover:text-primary hover:bg-secondary-container/30 rounded-xl transition-colors"
                onClick={() => { setShowMobileSearch(true); setShowDropdown(true); }}
                aria-label="Open search"
              >
                <FiSearch className="w-6 h-6" />
              </button>

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
                        className="absolute right-0 mt-1 w-48 bg-surface-container-lowest rounded-2xl shadow-editorial outline outline-1 outline-outline-variant/15 py-1.5 z-[80]"
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
      </div>

      <Modal
        isOpen={showMobileSearch}
        onClose={() => setShowMobileSearch(false)}
        title="Search products"
        size="full"
        className="!max-w-full !mx-0 w-full min-h-[85dvh] sm:min-h-0 sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-surface-container-lowest text-on-surface border-0 shadow-editorial"
        variant="default"
      >
        <div className="-m-6 -mt-2 pt-0">
          <SearchPanel
            embedded
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSubmit={handleSearch}
            onClear={clearSearch}
            suggestions={suggestions}
            searchLoading={searchLoading}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            onPickSuggestion={pickSuggestion}
            inputRef={searchRefMobile}
            containerRef={mobileModalSearchRef}
          />
          <p className="text-xs text-on-surface-variant mt-3 px-1">
            Type at least 2 characters to search products.
          </p>
        </div>
      </Modal>

      <InstallAppModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </header>
  );
};

export default Header;
