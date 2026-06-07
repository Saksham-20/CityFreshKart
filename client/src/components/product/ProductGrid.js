import React from 'react';
import ProductCard from './ProductCard';

const ProductGrid = ({ products, loading, error, flashProductId = null }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
        {[...Array(8)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md animate-pulse">
            <div className="bg-surface-container-high h-48 rounded-t-lg"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-surface-container-high rounded w-3/4"></div>
              <div className="h-3 bg-surface-container-high rounded w-1/2"></div>
              <div className="h-6 bg-surface-container-high rounded w-1/3"></div>
              <div className="h-10 bg-surface-container-high rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-on-surface mb-2">
          Something went wrong
        </h3>
        <p className="text-on-surface-variant mb-4">
          We couldn't load the products. Please try again later.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-on-surface-variant text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-on-surface mb-2">
          No products found
        </h3>
        <p className="text-on-surface-variant">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="asymmetric-grid gap-2.5 sm:gap-4">
      {products.map((product, index) => {
        const pid = product.id || product.product_id;
        const flash = flashProductId != null && String(pid) === String(flashProductId);
        return (
          <ProductCard key={product.id || product.product_id} product={product} highlightFlash={flash} priority={index < 4} />
        );
      })}
    </div>
  );
};

export default ProductGrid;
