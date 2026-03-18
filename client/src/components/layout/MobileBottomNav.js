import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiGrid, FiShoppingBag, FiUser } from 'react-icons/fi';
import useCart from '../../hooks/useCart';

/**
 * MobileBottomNav — sticky bottom navigation shown only on mobile (hidden md+).
 * Mirrors the navigation pattern used by Blinkit, Zepto, and other quick-commerce apps.
 */
const MobileBottomNav = () => {
  const location = useLocation();
  const { items: cartItems } = useCart();

  const cartCount = cartItems?.reduce((t, i) => t + i.quantity, 0) || 0;

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '?');

  const navItems = [
    { label: 'Home', icon: FiHome, href: '/' },
    { label: 'Shop', icon: FiGrid, href: '/products' },
    {
      label: 'Cart',
      icon: FiShoppingBag,
      href: '/cart',
      badge: cartCount > 0 ? cartCount : null
    },
    { label: 'Account', icon: FiUser, href: '/profile' }
  ];

  // Don't show on admin or auth pages
  if (
    location.pathname.startsWith('/admin') ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/checkout'
  ) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ label, icon: Icon, href, badge }) => {
          const active = href === '/' ? location.pathname === '/' : isActive(href);
          return (
            <Link
              key={href}
              to={href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors duration-200 ${
                active ? 'text-fresh-green' : 'text-gray-500'
              }`}
              aria-label={label}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
                {badge && (
                  <span className="absolute -top-1.5 -right-1.5 bg-fresh-green text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center leading-none px-0.5">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-fresh-green' : 'text-gray-500'}`}>
                {label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-fresh-green rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
