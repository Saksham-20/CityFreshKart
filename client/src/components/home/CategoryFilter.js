import React from 'react';
import { motion } from 'framer-motion';

const CATEGORIES = [
  { id: 'all', name: 'All', emoji: '🛒' },
  { id: 'vegetables', name: 'Vegetables', emoji: '🥬' },
  { id: 'fruits', name: 'Fruits', emoji: '🍎' },
  { id: 'herbs', name: 'Herbs', emoji: '🌿' }
];

const CategoryFilter = ({ selectedCategory, onCategoryChange }) => {
  return (
    <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 sm:pb-0 sm:mx-0 sm:px-0">
      <div className="flex gap-2 min-w-min sm:justify-center sm:flex-wrap">
        {CATEGORIES.map((category, index) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onCategoryChange(category.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm sm:text-base transition-all duration-200 whitespace-nowrap ${
              selectedCategory === category.id
                ? 'bg-fresh-green text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-fresh-green'
            }`}
          >
            <span className="text-lg">{category.emoji}</span>
            {category.name}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
