import React from 'react';

/**
 * ProductCardSkeleton — animated shimmer placeholder shown while products load.
 * Matches the dimensions of ProductCard to prevent layout shift.
 */
const ProductCardSkeleton = ({ count = 8 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl shadow-soft overflow-hidden animate-pulse"
          aria-hidden="true"
        >
          {/* Image placeholder */}
          <div className="aspect-square bg-gray-200" />

          {/* Content placeholder */}
          <div className="p-3 sm:p-4 space-y-2">
            {/* Category */}
            <div className="h-3 bg-gray-200 rounded-full w-1/3" />
            {/* Name */}
            <div className="h-4 bg-gray-200 rounded-full w-4/5" />
            <div className="h-4 bg-gray-200 rounded-full w-3/5" />
            {/* Rating */}
            <div className="h-3 bg-gray-200 rounded-full w-2/5" />
            {/* Price row */}
            <div className="flex items-center gap-2 pt-1">
              <div className="h-5 bg-gray-200 rounded-full w-1/3" />
              <div className="h-4 bg-gray-200 rounded-full w-1/4" />
            </div>
            {/* Button */}
            <div className="h-9 bg-gray-200 rounded-xl w-full mt-2" />
          </div>
        </div>
      ))}
    </>
  );
};

export default ProductCardSkeleton;
