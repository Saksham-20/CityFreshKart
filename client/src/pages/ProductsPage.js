import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductGrid from '../components/product/ProductGrid';
import ProductCardSkeleton from '../components/product/ProductCardSkeleton';
import api from '../services/api';

const CATEGORIES = [
  { name: 'All', emoji: '🛒' },
  { name: 'Vegetables', emoji: '🥬' },
  { name: 'Fruits', emoji: '🍎' },
  { name: 'Dairy', emoji: '🥛' },
  { name: 'Bakery', emoji: '🍞' },
  { name: 'Grains', emoji: '🌾' },
  { name: 'Herbs & Spices', emoji: '🌿' },
  { name: 'Other', emoji: '📦' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price ↑' },
  { value: 'price-high', label: 'Price ↓' },
];

const ProductsPage = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState('newest');
  const [activeCategory, setActiveCategory] = useState('All');
  const categoryRef = useRef(null);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, sortBy, searchQuery, activeCategory]);

  // Sync search query and category from URL params
  useEffect(() => {
    const q = searchParams.get('search') || '';
    const cat = searchParams.get('category') || '';
    setSearchQuery(q);
    if (cat && CATEGORIES.find(c => c.name === cat)) {
      setActiveCategory(cat);
    } else if (q) {
      setActiveCategory('All');
    }
  }, [searchParams]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products?page=1&limit=100');
      const items = response.data?.data?.products || response.data?.products || [];
      setProducts(items);
      setError(null);
    } catch (err) {
      setError('Failed to load products. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    if (activeCategory !== 'All') {
      filtered = filtered.filter(p =>
        (p.category || '').toLowerCase() === activeCategory.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => parseFloat(a.price_per_kg || 0) - parseFloat(b.price_per_kg || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => parseFloat(b.price_per_kg || 0) - parseFloat(a.price_per_kg || 0));
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
    }

    setFilteredProducts(filtered);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-14">

      {/* Hero delivery strip */}
      <div className="bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-base animate-pulse">⚡</span>
            <span>Delivery in <strong>30 minutes</strong></span>
          </div>
          <div className="text-green-100 text-xs hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-1">🌱 <span>Fresh produce</span></span>
            <span className="text-green-300">·</span>
            <span className="flex items-center gap-1">✅ <span>Quality guaranteed</span></span>
            <span className="text-green-300">·</span>
            <span className="flex items-center gap-1">🚚 <span>Free delivery over ₹300</span></span>
          </div>
        </div>
      </div>

      {/* Sticky category + filter bar */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-30 shadow-sm">
        {/* Category chips */}
        <div
          ref={categoryRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar px-3 sm:px-4 pt-2.5 pb-0"
          style={{ scrollbarWidth: 'none' }}
        >
          {CATEGORIES.map(cat => (
            <button
              key={cat.name}
              onClick={() => { setActiveCategory(cat.name); setSearchQuery(''); }}
              className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap ${
                activeCategory === cat.name
                  ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white border-transparent shadow-sm'
                  : 'text-gray-600 border-gray-200 bg-white hover:border-green-400 hover:text-green-700'
              }`}
            >
              <span className="text-sm leading-none">{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Sort + item count row */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2">
          <span className="text-xs text-gray-400 font-medium">
            {loading ? '' : `${filteredProducts.length} products`}
          </span>
          <div className="flex items-center gap-1.5">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  sortBy === opt.value
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            <ProductCardSkeleton count={12} />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">😕</div>
            <p className="text-gray-500 mb-4 text-sm">{error}</p>
            <button
              onClick={fetchProducts}
              className="text-sm text-white bg-green-600 hover:bg-green-700 font-medium px-5 py-2 rounded-lg"
            >
              Try again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">🥦</div>
            <p className="text-gray-600 font-semibold">No products found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchQuery ? `No results for "${searchQuery}"` : `Nothing in "${activeCategory}" yet — check back soon!`}
            </p>
            {(searchQuery || activeCategory !== 'All') && (
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                className="mt-4 text-sm text-green-600 font-semibold hover:underline"
              >
                Show all products
              </button>
            )}
          </div>
        ) : (
          <>
            {activeCategory !== 'All' && (
              <h2 className="text-base font-bold text-gray-800 mb-3">
                {CATEGORIES.find(c => c.name === activeCategory)?.emoji} {activeCategory}
              </h2>
            )}
            <ProductGrid products={filteredProducts} loading={false} error={null} />
          </>
        )}
      </div>

      {/* Global style for hiding scrollbar */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ProductsPage;
