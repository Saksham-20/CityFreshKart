import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { IoChevronDown, IoSearchOutline } from 'react-icons/io5';

const Navigation = () => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const dropdownRefs = useRef({});

  const navigationItems = [
    {
      name: 'VEGETABLES',
      href: '/products?category=sabzi-greens',
      dropdown: [
        { name: 'Sabzi & Greens', href: '/products?category=sabzi-greens', description: 'Taza sabziyan daily' },
        { name: 'Tamatar, Pyaaz, Mirch', href: '/products?category=sabzi-greens&type=basics', description: 'Kitchen essentials' },
        { name: 'Bhindi, Tori, Lauki', href: '/products?category=sabzi-greens&type=gourds', description: 'Fresh gourd vegetables' }
      ]
    },
    {
      name: 'FRUITS',
      href: '/products?category=fruits',
      dropdown: [
        { name: 'Seasonal Fruits', href: '/products?category=fruits&type=seasonal', description: 'Fresh this season' },
        { name: 'Exotic Fruits', href: '/products?category=fruits&type=exotic', description: 'Avocado, Kiwi & more' },
        { name: 'Banana, Apple, Orange', href: '/products?category=fruits&type=daily', description: 'Everyday favourites' }
      ]
    },
    {
      name: 'ROOT VEG',
      href: '/products?category=root-vegetables',
      dropdown: [
        { name: 'Aloo (Potato)', href: '/products?category=root-vegetables&type=potato', description: 'Premium quality potatoes' },
        { name: 'Gajar, Shalgam', href: '/products?category=root-vegetables&type=carrots', description: 'Carrots & turnips' },
        { name: 'Adrak, Lehsun', href: '/products?category=root-vegetables&type=spice', description: 'Ginger, garlic & more' }
      ]
    },
    {
      name: 'EXOTICS & HERBS',
      href: '/products?category=exotic-herbs',
      dropdown: [
        { name: 'Fresh Herbs', href: '/products?category=exotic-herbs&type=herbs', description: 'Dhania, pudina, curry patta' },
        { name: 'Mushrooms', href: '/products?category=exotic-herbs&type=mushrooms', description: 'Button, oyster & more' },
        { name: 'Baby Corn, Broccoli', href: '/products?category=exotic-herbs&type=exotic', description: 'Exotic veggies' }
      ]
    },
    {
      name: 'DAILY ESSENTIALS',
      href: '/products?category=daily-essentials',
      dropdown: [
        { name: 'Atta & Dal', href: '/products?category=daily-essentials&type=grains', description: 'Flour, lentils & rice' },
        { name: 'Spices & Masala', href: '/products?category=daily-essentials&type=spices', description: 'Haldi, jeera, mirch' },
        { name: 'Oil & Ghee', href: '/products?category=daily-essentials&type=oils', description: 'Cooking oils & desi ghee' }
      ]
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !dropdownRefs.current[activeDropdown]?.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  useEffect(() => {
    setActiveDropdown(null);
    setIsSearchOpen(false);
  }, [location]);

  const handleDropdownToggle = (name) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const isActive = (href) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="hidden lg:flex items-center space-x-8">
      <Link to="/" className="flex items-center">
        {/* Mobile logo with white background - shown only on small screens */}
        <div className="sm:hidden bg-white rounded-lg p-1">
          <img src="/logo-mobile.png" alt="CityFreshKart" className="h-8 w-auto object-contain" />
        </div>
        {/* Desktop logo - shown on sm and larger */}
        <img src="/CityFreshKart.png" alt="CityFreshKart" className="hidden sm:block h-8 w-auto object-contain" />
      </Link>
      {/* Main Navigation Items */}
      {navigationItems.map((item) => (
        <div key={item.name} className="relative" ref={(el) => dropdownRefs.current[item.name] = el}>
          <button
            onClick={() => handleDropdownToggle(item.name)}
            className={`flex items-center space-x-1 py-2 px-3 rounded-lg transition-all duration-200 font-medium ${isActive(item.href)
                ? 'text-fresh-green bg-fresh-green/10'
                : 'text-gray-700 hover:text-fresh-green hover:bg-gray-50'
              }`}
          >
            <span>{item.name}</span>
            <IoChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === item.name ? 'rotate-180' : ''
                }`}
            />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {activeDropdown === item.name && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 py-4 z-50"
              >
                <div className="grid grid-cols-1 gap-1">
                  {item.dropdown.map((dropdownItem) => (
                    <Link
                      key={dropdownItem.name}
                      to={dropdownItem.href}
                      className="flex flex-col px-4 py-3 hover:bg-gray-50 transition-colors duration-150 group"
                    >
                      <span className="font-medium text-gray-900 group-hover:text-fresh-green transition-colors duration-150">
                        {dropdownItem.name}
                      </span>
                      <span className="text-sm text-gray-500 mt-1">
                        {dropdownItem.description}
                      </span>
                    </Link>
                  ))}
                </div>

                {/* View All Link */}
                <div className="border-t border-gray-100 mt-3 pt-3">
                  <Link
                    to={item.href}
                    className="flex items-center justify-between px-4 py-2 text-fresh-green hover:bg-fresh-green/5 transition-colors duration-150"
                  >
                    <span className="font-medium">View All {item.name}</span>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="w-4 h-4"
                    >
                      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.div>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* Search Button */}
      <button
        onClick={() => setIsSearchOpen(!isSearchOpen)}
        className="p-2 text-gray-700 hover:text-fresh-green hover:bg-gray-50 rounded-lg transition-all duration-200"
        aria-label="Search"
      >
        <IoSearchOutline className="w-5 h-5" />
      </button>

      {/* Search Bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 300 }}
            exit={{ opacity: 0, width: 0 }}
            className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 py-4 px-6 z-50"
          >
            <div className="max-w-7xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search vegetables, fruits, herbs..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fresh-green focus:border-transparent"
                  autoFocus
                />
                <IoSearchOutline className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navigation;
