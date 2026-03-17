import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ProductGrid from '../components/product/ProductGrid';
import ProductCardSkeleton from '../components/product/ProductCardSkeleton';
import FilterSidebar from '../components/common/FilterSidebar';
import SearchBar from '../components/common/SearchBar';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';

const ProductsPage = ({ category: propCategory }) => {
  const { subcategory } = useParams();
  const [searchParams] = useSearchParams();
  const category = propCategory || subcategory || searchParams.get('category') || '';
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    priceRange: [0, 5000],
    sortBy: 'newest'
  });
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [category]);

  useEffect(() => {
    applyFilters();
  }, [products, filters, searchQuery]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({ page: '1', limit: '50' });

      if (category) {
        const categoryMap = {
          'sabzi-greens': 'sabzi-greens',
          'fruits': 'fruits',
          'root-vegetables': 'root-vegetables',
          'exotic-herbs': 'exotic-herbs',
          'daily-essentials': 'daily-essentials',
        };
        const categorySlug = categoryMap[category];
        if (categorySlug) queryParams.append('category', categorySlug);
      }

      const response = await api.get(`/products?${queryParams}`);
      if (response.data) {
        const items = response.data.data?.products || response.data.products || [];
        setProducts(items);
        setError(null);
      } else {
        throw new Error('Failed to fetch products');
      }
    } catch (err) {
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    // Apply search filter (now using frontend filter as backup)
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(product => product.category_name === filters.category);
    }

    // Apply price range filter (price_per_kg)
    filtered = filtered.filter(product => {
      const price = parseFloat(product.price_per_kg || 0);
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    // Apply sorting
    switch (filters.sortBy) {
      case 'price-low':
        filtered.sort((a, b) => parseFloat(a.price_per_kg) - parseFloat(b.price_per_kg));
        break;
      case 'price-high':
        filtered.sort((a, b) => parseFloat(b.price_per_kg) - parseFloat(a.price_per_kg));
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }

    setFilteredProducts(filtered);
  };

  const handleFilterChange = (newFilters) => setFilters(prev => ({ ...prev, ...newFilters }));
  const handleSearch = (query) => setSearchQuery(query);
  const categories = [...new Set(products.map(p => p.category_name).filter(Boolean))];

  const pageTitle = category
    ? category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'All Products';

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-fresh-green-50 to-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header Section */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-fresh-green-100 text-fresh-green-700">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 21c4.5 0 8-3.5 8-8 0-6-8-10-8-10s-8 4-8 10c0 4.5 3.5 8 8 8Z" />
                <path d="M12 10v8" />
                <path d="M8.5 13.5c1.5-1.5 5.5-1.5 7 0" />
              </svg>
            </span>
            {pageTitle}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl">
            {category
              ? `Fresh, organic ${category.replace(/-/g, ' ')} delivered daily from local farms`
              : 'Explore our premium collection of fresh produce from trusted local farmers'}
          </p>
        </div>

        {/* Search and Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8">
          <div className="flex-1">
            <SearchBar
              onSearch={handleSearch}
              initialValue={searchQuery}
              placeholder="Search vegetables, fruits..."
              className="w-full"
              size="sm"
            />
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="xl:hidden flex items-center gap-2 px-4 py-2.5 border border-fresh-green-200 rounded-lg text-sm text-fresh-green-700 hover:bg-fresh-green-50 bg-white transition-all duration-200 font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>

            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
              className="px-4 py-2.5 border border-fresh-green-200 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-fresh-green-500 focus:border-fresh-green-500 transition-all duration-200 font-semibold hover:border-fresh-green-400"
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className={`xl:w-72 flex-shrink-0 ${showFilters ? 'block' : 'hidden xl:block'}`}>
            <FilterSidebar
              filters={filters}
              categories={categories}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {!loading && (
              <div className="mb-4 text-sm text-gray-600 bg-white/60 backdrop-blur-sm px-4 py-3 rounded-lg border border-gray-200">
                Showing <strong className="text-fresh-green-600 font-semibold">{filteredProducts.length}</strong> of <strong className="text-fresh-green-600 font-semibold">{products.length}</strong> products
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                <ProductCardSkeleton count={8} />
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={fetchProducts}
                  className="text-sm text-white font-semibold bg-gradient-to-r from-fresh-green-500 to-fresh-green-600 hover:from-fresh-green-600 hover:to-fresh-green-700 px-6 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Try again
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-600 mb-4">No products found matching your filters</p>
                <button
                  onClick={() => handleFilterChange({ category: '', priceRange: [0, 5000] })}
                  className="text-sm text-white font-semibold bg-gradient-to-r from-fresh-green-500 to-fresh-green-600 hover:from-fresh-green-600 hover:to-fresh-green-700 px-6 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <ProductGrid
                products={filteredProducts}
                loading={false}
                error={null}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
