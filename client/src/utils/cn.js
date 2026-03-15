import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge Tailwind CSS classes
 * Combines clsx for conditional classes with twMerge to resolve Tailwind conflicts
 */
export const cn = (...inputs) => {
  return twMerge(clsx(inputs));
};
