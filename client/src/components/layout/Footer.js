import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Footer = () => {
  const year = new Date().getFullYear();
  const navigate = useNavigate();

  return (
    <footer className="bg-white border-t border-gray-100 mt-8">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">

          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="inline-block mb-3">
              <span className="text-lg font-extrabold text-green-600">City<span className="text-gray-900">Fresh</span>Kart</span>
            </Link>
            <p className="text-xs text-gray-400 leading-relaxed">
              Fresh produce delivered to your door in 30 minutes. Quality guaranteed.
            </p>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-orange-600 font-semibold">
              <span>⚡</span>
              <span>30 min delivery</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Shop</h4>
            <ul className="space-y-2">
              {['Vegetables', 'Fruits', 'Dairy', 'Bakery', 'Grains'].map(cat => (
                <li key={cat}>
                  <button
                    onClick={() => navigate(`/products?category=${encodeURIComponent(cat)}`)}
                    className="text-xs text-gray-500 hover:text-green-600 transition-colors"
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Account</h4>
            <ul className="space-y-2">
              <li><Link to="/products" className="text-xs text-gray-500 hover:text-green-600 transition-colors">Browse Products</Link></li>
              <li><Link to="/cart" className="text-xs text-gray-500 hover:text-green-600 transition-colors">My Cart</Link></li>
            </ul>
          </div>

          {/* Trust badges */}
          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Why Us</h4>
            <ul className="space-y-2.5">
              {[
                { icon: '🌿', text: '100% Fresh' },
                { icon: '🚚', text: 'Free Delivery ₹300+' },
                { icon: '🔒', text: 'Secure Payments' },
                { icon: '↩️', text: 'Easy Returns' },
              ].map(({ icon, text }) => (
                <li key={text} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>{icon}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-100 py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-gray-400">
            &copy; {year} CityFreshKart. All rights reserved.
          </p>
          <p className="text-[11px] text-gray-400">
            Made with <span className="text-red-400">♥</span> for fresh food lovers
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
