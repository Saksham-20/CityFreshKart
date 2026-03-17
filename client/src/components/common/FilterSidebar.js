import React from 'react';

const FilterSidebar = ({ filters, categories, onFilterChange }) => {
  const handleCategoryChange = (category) => {
    onFilterChange({ category: filters.category === category ? '' : category });
  };

  const handlePriceRangeChange = (index, value) => {
    const newRange = [...filters.priceRange];
    const parsedValue = Number.parseInt(value, 10);
    newRange[index] = Number.isNaN(parsedValue) ? 0 : parsedValue;
    onFilterChange({ priceRange: newRange });
  };

  const clearFilters = () => {
    onFilterChange({
      category: '',
      priceRange: [0, 5000]
    });
  };

  const hasActiveFilters = filters.category || 
    filters.priceRange[0] > 0 || filters.priceRange[1] < 5000;

  return (
    <div className="bg-gradient-to-br from-white via-fresh-green-50 to-white rounded-2xl shadow-lg border border-fresh-green-100 p-6 sticky top-24">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-fresh-green-100 text-fresh-green-700">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 5h18" />
              <path d="M6 12h12" />
              <path d="M10 19h4" />
            </svg>
          </span>
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs font-semibold text-fresh-green-600 hover:text-fresh-green-700 bg-fresh-green-100 hover:bg-fresh-green-200 px-3 py-1.5 rounded-full transition-all duration-200"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="mb-8">
        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-fresh-green-100 text-fresh-green-700">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z" />
              <path d="M3 7.5V16.5L12 21l9-4.5V7.5" />
            </svg>
          </span>
          Categories
        </h4>
        <div className="space-y-3">
          {categories.map((category) => (
            <label key={category} className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.category === category}
                onChange={() => handleCategoryChange(category)}
                className="h-4 w-4 text-fresh-green-600 focus:ring-fresh-green-500 border-gray-300 rounded accent-fresh-green-600"
              />
              <span className="ml-3 text-sm text-gray-700 group-hover:text-fresh-green-600 transition-colors duration-200">{category}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-fresh-green-100 text-fresh-green-700">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 10.5c0-1.1 1.2-2 2.5-2s2.5.9 2.5 2-1.2 2-2.5 2-2.5.9-2.5 2 1.2 2 2.5 2 2.5-.9 2.5-2" />
            </svg>
          </span>
          Price Range
        </h4>
        <div className="space-y-4">
          <div className="px-3 py-3 bg-white rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <label className="block text-[11px] text-gray-500 mb-1">Min</label>
                <div className="flex items-center gap-1.5 rounded border border-gray-300 px-2 py-1.5 focus-within:ring-2 focus-within:ring-fresh-green-500 focus-within:border-fresh-green-500">
                  <span className="text-sm text-gray-600 font-semibold">₹</span>
                  <input
                    type="number"
                    value={filters.priceRange[0]}
                    onChange={(e) => handlePriceRangeChange(0, e.target.value)}
                    className="min-w-0 w-full text-sm outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] text-gray-500 mb-1">Max</label>
                <div className="flex items-center gap-1.5 rounded border border-gray-300 px-2 py-1.5 focus-within:ring-2 focus-within:ring-fresh-green-500 focus-within:border-fresh-green-500">
                  <span className="text-sm text-gray-600 font-semibold">₹</span>
                  <input
                    type="number"
                    value={filters.priceRange[1]}
                    onChange={(e) => handlePriceRangeChange(1, e.target.value)}
                    className="min-w-0 w-full text-sm outline-none"
                    placeholder="5000"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Price range slider */}
          <div>
            <input
              type="range"
              min="0"
              max="5000"
              value={filters.priceRange[1]}
              onChange={(e) => handlePriceRangeChange(1, e.target.value)}
              className="w-full h-2 bg-gradient-to-r from-fresh-green-200 to-fresh-green-600 rounded-lg appearance-none cursor-pointer slider accent-fresh-green-600"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-2 font-semibold">
              <span>₹0</span>
              <span>₹{filters.priceRange[1]}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;
