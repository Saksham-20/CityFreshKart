import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { IoClose, IoChevronDown, IoSearchOutline, IoMenu } from 'react-icons/io5';

const MobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const location = useLocation();

  const menuItems = [
    {
      name: 'Vegetables',
      href: '/products?category=sabzi-greens',
      subItems: [
        { name: 'Sabzi & Greens', href: '/products?category=sabzi-greens' },
        { name: 'Root Vegetables', href: '/products?category=root-vegetables' },
        { name: 'Exotic & Herbs', href: '/products?category=exotic-herbs' }
      ]
    },
    {
      name: 'Fruits',
      href: '/products?category=fruits',
      subItems: [
        { name: 'Seasonal Fruits', href: '/products?category=fruits' },
        { name: 'Daily Essentials', href: '/products?category=daily-essentials' }
      ]
    },
    {
      name: 'Offers',
      href: '/products?category=offers',
      subItems: [
        { name: 'Today\'s Deals', href: '/products?category=offers' },
        { name: 'New Arrivals', href: '/products?category=new-arrivals' },
        { name: 'Bestsellers', href: '/products?category=bestsellers' }
      ]
    },
    {
      name: 'About',
      href: '/about',
      subItems: [
        { name: 'Our Story', href: '/about' },
        { name: 'Our Farmers', href: '/about' },
        { name: 'Sustainability', href: '/about' }
      ]
    }
  ];

  const quickLinks = [
    { name: 'Customer Service', href: '/contact' },
    { name: 'Delivery Info', href: '/delivery-info' },
    { name: 'Return Policy', href: '/return-policy' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Track Order', href: '/track-order' }
  ];

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const closeMenu = () => {
    setIsOpen(false);
    document.body.style.overflow = 'unset';
    setExpandedSections({});
  };

  const isActive = (href) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={toggleMenu}
        className="lg:hidden p-2 text-gray-700 hover:text-fresh-green hover:bg-gray-50 rounded-lg transition-all duration-200"
        aria-label="Toggle mobile menu"
      >
        <IoMenu className="w-6 h-6" />
      </button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={closeMenu}
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 lg:hidden overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Menu
              </h2>
              <button
                onClick={closeMenu}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <IoClose className="w-6 h-6" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search vegetables, fruits..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fresh-green focus:border-transparent"
                />
                <IoSearchOutline className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Main Menu Items */}
            <div className="p-6 space-y-2">
              {menuItems.map((item) => (
                <div key={item.name} className="border-b border-gray-100 last:border-b-0">
                  <button
                    onClick={() => toggleSection(item.name)}
                    className={`w-full flex items-center justify-between py-4 text-left ${isActive(item.href)
                        ? 'text-fresh-green font-semibold'
                        : 'text-gray-900'
                      }`}
                  >
                    <span className="text-lg">{item.name}</span>
                    <IoChevronDown
                      className={`w-5 h-5 transition-transform duration-200 ${expandedSections[item.name] ? 'rotate-180' : ''
                        }`}
                    />
                  </button>

                  {/* Submenu */}
                  <AnimatePresence>
                    {expandedSections[item.name] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 pb-4 space-y-2">
                          {item.subItems.map((subItem) => (
                            <Link
                              key={subItem.name}
                              to={subItem.href}
                              onClick={closeMenu}
                              className="block py-2 text-gray-600 hover:text-fresh-green transition-colors duration-150"
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Quick Links */}
            <div className="p-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Links
              </h3>
              <div className="space-y-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={closeMenu}
                    className="block py-2 text-gray-600 hover:text-fresh-green transition-colors duration-150"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Need Help?
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Call: +91 98765 43210</p>
                <p>Email: hello@frashcart.in</p>
                <p>Hours: Mon-Sat 6AM-9PM IST</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileMenu;
