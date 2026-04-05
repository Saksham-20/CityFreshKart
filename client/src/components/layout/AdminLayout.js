import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiExternalLink, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: '📊' },
    { name: 'Products', href: '/admin/products', icon: '🛍️' },
    { name: 'Categories', href: '/admin/categories', icon: '🏷️' },
    { name: 'Orders', href: '/admin/orders', icon: '📦' },
    { name: 'Users', href: '/admin/users', icon: '👥' },
    // { name: 'Analytics', href: '/admin/analytics', icon: '📈' }, // hidden temporarily
    { name: 'Banners', href: '/admin/marketing-banners', icon: '🖼️' },
    { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
  ];

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                className="lg:hidden mr-2 p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open admin menu"
              >
                <FiMenu className="w-5 h-5" />
              </button>
              <Link to="/admin" className="flex items-center">
                {/* Mobile logo with white background */}
                <div className="sm:hidden bg-white rounded-lg p-1">
                  <img
                    src="/logo-mobile.png"
                    alt="CityFreshKart"
                    className="h-7 w-auto object-contain"
                  />
                </div>
                {/* Desktop logo */}
                <img
                  src="/CityFreshKart.png"
                  alt="CityFreshKart"
                  className="hidden sm:block h-7 sm:h-8 w-auto object-contain"
                />
                <div className="ml-2 sm:ml-3 min-w-0">
                  <p className="text-base sm:text-xl font-bold text-gray-900 leading-tight">Admin Panel</p>
                  <p className="text-[11px] sm:text-xs text-gray-500 leading-tight hidden sm:block">CityFreshKart</p>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500 hidden sm:block">
                {user?.name || user?.first_name || 'Admin'}
              </span>
              <Link
                to="/"
                className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors"
              >
                <FiExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">View Store</span>
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <FiLogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close admin menu"
            className="fixed inset-0 z-30 bg-black/35 lg:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar Navigation */}
        <nav
          className={`fixed lg:static top-16 lg:top-0 left-0 z-40 w-64 bg-white shadow-sm min-h-[calc(100vh-4rem)] lg:min-h-screen transform transition-transform duration-200 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-4">
            <div className="lg:hidden flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-700">Navigation</p>
              <button
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                onClick={closeSidebar}
                aria-label="Close navigation"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={closeSidebar}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
