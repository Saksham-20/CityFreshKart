import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { WEIGHT_OPTIONS, formatWeight, calculatePrice } from '@/utils/weightSystem';

/**
 * WeightSelector Component
 * Allows users to select product weight and displays calculated price
 */
const WeightSelector = ({
  weight = 1,
  onWeightChange,
  pricePerKg,
  discount = 0,
  className,
}) => {
  const pricing = calculatePrice(pricePerKg, weight, discount);
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Weight Label */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Select Weight
        </label>
        <span className="text-xs text-gray-500">
          {formatWeight(weight)}
        </span>
      </div>

      {/* Weight Selector Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full h-10 px-3 flex items-center justify-between',
            'rounded-lg border border-gray-300 bg-white',
            'text-sm font-medium text-gray-900',
            'hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500',
            'transition-colors duration-200'
          )}
        >
          <span>{formatWeight(weight)}</span>
          <ChevronDown className={cn(
            'w-4 h-4 text-gray-500 transition-transform',
            { 'transform rotate-180': isOpen }
          )} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className='absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10'>
            {WEIGHT_OPTIONS.map((w) => (
              <button
                key={w}
                onClick={() => {
                  onWeightChange(w);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2.5 text-left text-sm',
                  'hover:bg-green-50 active:bg-green-100',
                  'transition-colors duration-150',
                  'border-b border-gray-100 last:border-b-0',
                  { 'bg-green-50 font-semibold text-green-700': weight === w }
                )}
              >
                <span className="flex items-center justify-between">
                  <span>{formatWeight(w)}</span>
                  <span className="text-xs text-gray-500">
                    {formatPrice(pricePerKg * w)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Price Display */}
      <div className="mt-3 space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-600">Price per kg:</span>
          <span className="text-sm font-medium text-gray-900">
            ₹{pricePerKg}
          </span>
        </div>

        {discount > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-600">Discount:</span>
            <span className="text-sm font-medium text-red-600">
              -₹{Math.round(discount)}
            </span>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-gray-900">Total Price:</span>
          <span className="text-lg font-bold text-green-600">
            ₹{Math.round(pricing.finalPrice)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WeightSelector;
