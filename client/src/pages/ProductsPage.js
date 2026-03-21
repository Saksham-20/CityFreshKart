import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ProductGrid from '../components/product/ProductGrid';
import ProductCardSkeleton from '../components/product/ProductCardSkeleton';
import PromoCarousel from '../components/product/PromoCarousel';
import OffersCarousel from '../components/product/OffersCarousel';
import api from '../services/api';

const DEFAULT_CATEGORY_NAMES = ['Vegetables', 'Fruits', 'Dairy', 'Bakery', 'Grains', 'Herbs & Spices', 'Other'];
const getCategoryEmoji = (name) => {
  const key = String(name || '').toLowerCase();
  if (key.includes('veg')) return '🥬';
  if (key.includes('fruit')) return '🍎';
  if (key.includes('dairy')) return '🥛';
  if (key.includes('bakery')) return '🍞';
  if (key.includes('grain')) return '🌾';
  if (key.includes('herb') || key.includes('spice')) return '🌿';
  if (key.includes('other')) return '📦';
  return '📦';
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price ↑' },
  { value: 'price-high', label: 'Price ↓' },
];

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState('newest');
  const [activeCategory, setActiveCategory] = useState('All');
  const [categoryNames, setCategoryNames] = useState(DEFAULT_CATEGORY_NAMES);
  const [flashProductId, setFlashProductId] = useState(null);
  const categoryRef = useRef(null);
  const highlightId = searchParams.get('highlight');
  const highlightsMode = searchParams.get('highlights') === '1';

  const fetchProducts = useCallback(async () => {
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
  }, []);

  const fetchHighlights = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/products/carousel?all=1&limit=500');
      const items = response.data?.data?.items || response.data?.data?.products || [];
      setProducts(Array.isArray(items) ? items : []);
      setError(null);
    } catch (err) {
      setError('Failed to load deals and new arrivals. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (highlightsMode) fetchHighlights();
    else fetchProducts();
  }, [highlightsMode, fetchHighlights, fetchProducts]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, sortBy, searchQuery, activeCategory]);

  useEffect(() => {
    const q = searchParams.get('search') || '';
    const cat = searchParams.get('category') || '';
    if (searchParams.get('highlight')) {
      return;
    }
    setSearchQuery(q);
    if (cat && categoryNames.some(c => c.toLowerCase() === cat.toLowerCase())) {
      setActiveCategory(cat);
    } else if (q) {
      setActiveCategory('All');
    }
  }, [searchParams, categoryNames]);

  useEffect(() => {
    if (!highlightId) return;
    setActiveCategory('All');
    setSearchQuery('');
  }, [highlightId]);

  useEffect(() => {
    if (!highlightId || loading) return;
    if (filteredProducts.length === 0) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('highlight');
        return next;
      }, { replace: true });
      return;
    }

    const inList = filteredProducts.some(
      (p) =>
        String(p.id) === String(highlightId) ||
        String(p.product_id) === String(highlightId),
    );
    if (!inList) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('highlight');
        return next;
      }, { replace: true });
      return;
    }

    let clearFlashTimer;
    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`product-${highlightId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFlashProductId(highlightId);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('highlight');
        return next;
      }, { replace: true });
      clearFlashTimer = window.setTimeout(() => setFlashProductId(null), 3500);
    }, 100);

    return () => {
      window.clearTimeout(scrollTimer);
      if (clearFlashTimer) window.clearTimeout(clearFlashTimer);
    };
  }, [highlightId, loading, filteredProducts, setSearchParams]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories');
      const next = res.data?.data;
      if (Array.isArray(next) && next.length > 0) setCategoryNames(next);
    } catch (_) {
      setCategoryNames(DEFAULT_CATEGORY_NAMES);
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
        (p.description && p.description.toLowerCase().includes(q))
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
    <div className="min-h-screen bg-surface pt-14">

      {/* Top promo strip */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary-container text-on-primary">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined text-[20px]">bolt</span>
            <span>Delivery in <strong>30 minutes</strong></span>
          </div>
          <div className="text-on-primary/90 text-xs hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">eco</span> Fresh</span>
            <span className="opacity-50">·</span>
            <span>Free delivery over ₹300</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <section className="mb-6">
          {highlightsMode ? (
            <>
              <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-on-surface leading-[1.1] mb-2">
                Deals &amp; new arrivals
              </h1>
              <p className="text-on-surface-variant text-sm font-medium max-w-md mb-3">
                Discounted picks and products added in the last 14 days — same pool as Daily Highlights.
              </p>
              <Link
                to="/"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Back to all products
              </Link>
            </>
          ) : (
            <>
              <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-on-surface leading-[1.1] mb-2">
                Freshly harvested
                <br />
                <span className="text-primary">just for you.</span>
              </h1>
              <p className="text-on-surface-variant text-sm font-medium max-w-md">
                Direct from trusted sources to your doorstep — fast.
              </p>
            </>
          )}
        </section>

        {!highlightsMode && (
          <>
            <OffersCarousel />
            <PromoCarousel />
          </>
        )}
      </div>

      {/* Sticky category + filter bar */}
      <div className="bg-surface-container-lowest/95 backdrop-blur-md sticky top-14 z-30 shadow-editorial outline outline-1 outline-outline-variant/10">
        <div
          ref={categoryRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-3 sm:px-4 lg:px-8 pt-3 pb-0 max-w-7xl mx-auto"
        >
          <button
            type="button"
            onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}
            className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-full transition-all whitespace-nowrap ${
              activeCategory === 'All'
                ? 'bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-primary-glow'
                : 'bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim/50'
            }`}
          >
            <span className="text-sm leading-none">🛒</span>
            <span>All</span>
          </button>

          {categoryNames.map((catName) => (
            <button
              key={catName}
              type="button"
              onClick={() => { setActiveCategory(catName); setSearchQuery(''); }}
              className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-full transition-all whitespace-nowrap ${
                String(activeCategory).toLowerCase() === String(catName).toLowerCase()
                  ? 'bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-primary-glow'
                  : 'bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim/50'
              }`}
            >
              <span className="text-sm leading-none">{getCategoryEmoji(catName)}</span>
              <span>{catName}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-3 sm:px-4 lg:px-8 py-2.5 max-w-7xl mx-auto">
          <span className="text-xs text-on-surface-variant font-medium">
            {loading ? '' : `${filteredProducts.length} products`}
          </span>
          <div className="flex items-center gap-1.5">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSortBy(opt.value)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  sortBy === opt.value
                    ? 'bg-inverse-surface text-inverse-on-surface'
                    : 'text-on-surface-variant bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            <ProductCardSkeleton count={12} />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">😕</div>
            <p className="text-on-surface-variant mb-4 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => (highlightsMode ? fetchHighlights() : fetchProducts())}
              className="text-sm text-on-primary bg-primary hover:opacity-95 font-medium px-5 py-2 rounded-full"
            >
              Try again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">🥦</div>
            <p className="text-on-surface font-headline font-semibold">No products found</p>
            <p className="text-on-surface-variant text-sm mt-1">
              {searchQuery ? `No results for "${searchQuery}"` : `Nothing in "${activeCategory}" yet — check back soon!`}
            </p>
            {(searchQuery || activeCategory !== 'All') && !highlightsMode && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                className="mt-4 text-sm text-primary font-semibold hover:underline"
              >
                Show all products
              </button>
            )}
            {(searchQuery || activeCategory !== 'All') && highlightsMode && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                className="mt-4 text-sm text-primary font-semibold hover:underline"
              >
                Clear filters
              </button>
            )}
            {!searchQuery && activeCategory === 'All' && highlightsMode && (
              <Link
                to="/"
                className="mt-4 inline-block text-sm text-primary font-semibold hover:underline"
              >
                Browse full catalog
              </Link>
            )}
          </div>
        ) : (
          <>
            {activeCategory !== 'All' && (
              <h2 className="text-base font-headline font-bold text-on-surface mb-3">
                {getCategoryEmoji(activeCategory)} {activeCategory}
              </h2>
            )}
            <ProductGrid products={filteredProducts} loading={false} error={null} flashProductId={flashProductId} />
          </>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;
