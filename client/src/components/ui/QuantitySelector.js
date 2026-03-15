import React from 'react';
import { motion } from 'framer-motion';

/**
 * QuantitySelector — reusable ± stepper used on ProductCard, CartItem, ProductDetail.
 * Props:
 *   quantity (number) — current quantity
 *   onIncrease (fn) — called when + is clicked
 *   onDecrease (fn) — called when - is clicked; component does NOT decrement below min
 *   min (number, default 1) — minimum allowed value
 *   max (number, default 99) — maximum allowed value
 *   size ('sm' | 'md' | 'lg', default 'md')
 *   className (string)
 */
const QuantitySelector = ({
  quantity,
  onIncrease,
  onDecrease,
  min = 1,
  max = 99,
  size = 'md',
  className = ''
}) => {
  const sizes = {
    sm: { btn: 'w-6 h-6 text-sm', text: 'w-6 text-xs', icon: 'w-3 h-3' },
    md: { btn: 'w-8 h-8 text-sm', text: 'w-8 text-sm', icon: 'w-3.5 h-3.5' },
    lg: { btn: 'w-10 h-10 text-base', text: 'w-10 text-base', icon: 'w-4 h-4' }
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className={`inline-flex items-center rounded-full border border-fresh-green bg-white ${className}`}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={onDecrease}
        disabled={quantity <= min}
        aria-label="Decrease quantity"
        className={`${s.btn} flex items-center justify-center text-fresh-green rounded-full hover:bg-fresh-green hover:text-white transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0`}
      >
        <svg className={s.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
        </svg>
      </motion.button>

      <span className={`${s.text} font-semibold text-gray-900 text-center select-none`}>
        {quantity}
      </span>

      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={onIncrease}
        disabled={quantity >= max}
        aria-label="Increase quantity"
        className={`${s.btn} flex items-center justify-center text-fresh-green rounded-full hover:bg-fresh-green hover:text-white transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0`}
      >
        <svg className={s.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </motion.button>
    </div>
  );
};

export default QuantitySelector;
