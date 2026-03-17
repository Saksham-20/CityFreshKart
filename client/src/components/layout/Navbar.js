import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Navbar — Top navigation with branding
 */
const Navbar = () => {
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
            <p className="text-xs text-white/80">Fresh Produce</p>
          </div>

          {/* Right section spacer */}
          <div className="w-8" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
