import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductGrid from '../components/product/ProductGrid';
import FilterSidebar from '../components/common/FilterSidebar';
import SearchBar from '../components/common/SearchBar';
import Pagination from '../components/common/Pagination';
import useProducts from '../hooks/useProducts';
import Loading from '../components/ui/Loading';

const CollectionPage = () => {
  const { slug } = useParams();
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('featured');
  const { products, loading, error, totalPages } = useProducts({
    collection: slug,
    page: currentPage,
    filters,
    sortBy
  });

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
    setCurrentPage(1);
  };

  if (loading) return <Loading />;
  if (error) return <div className="text-center text-red-600 py-8">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4 capitalize">
            {slug.replace(/-/g, ' ')}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Browse our fresh selection of {slug.replace(/-/g, ' ')},
            sourced directly from local farms.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <FilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              sortBy={sortBy}
              onSortChange={handleSortChange}
            />
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Search and Sort */}
            <div className="mb-6">
              <SearchBar
                placeholder="Search within category..."
                onSearch={(query) => setFilters(prev => ({ ...prev, search: query }))}
              />
            </div>

            {/* Products Grid */}
            {products.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <ProductGrid products={products} />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="text-center py-16">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600">
                  Try adjusting your filters or search terms to find what you're looking for.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionPage;

