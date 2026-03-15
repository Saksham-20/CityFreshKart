import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ProductGrid from '../components/product/ProductGrid';
import ProductCardSkeleton from '../components/product/ProductCardSkeleton';
import SearchBar from '../components/common/SearchBar';
import FilterSidebar from '../components/common/FilterSidebar';
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
    rating: 0,
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
          'new-arrivals': 'new-arrivals',
          'bestsellers': 'bestsellers',
          'offers': 'offers'
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

    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (filters.category) {
      filtered = filtered.filter(product => product.category_name === filters.category);
    }

    filtered = filtered.filter(product => {
      const price = parseFloat(product.price);
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    if (filters.rating > 0) {
      filtered = filtered.filter(product => (product.average_rating || 0) >= filters.rating);
    }

    switch (filters.sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
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
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{pageTitle}</h1>
          <p className="text-sm text-gray-500">
            {category
              ? `Fresh ${category.replace(/-/g, ' ')} delivered daily`
              : 'Browse our fresh collection of farm produce'}
          </p>
        </div>

        {/* Search and Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
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
              className="xl:hidden flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 bg-white transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              {showFilters ? 'Hide' : 'Filter'}
            </button>

            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:ring-2 focus:ring-fresh-green focus:border-fresh-green transition-colors duration-200 min-w-[150px]"
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-5">
          {/* Filters Sidebar */}
          <div className={`xl:w-60 ${showFilters ? 'block' : 'hidden xl:block'}`}>
            <FilterSidebar
              filters={filters}
              categories={categories}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {!loading && (
              <div className="mb-3 text-sm text-gray-500">
                Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                <ProductCardSkeleton count={8} />
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <p className="text-gray-500 mb-4">{error}</p>
                <button
                  onClick={fetchProducts}
                  className="text-sm text-fresh-green font-medium hover:text-fresh-green-dark"
                >
                  Try again
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
