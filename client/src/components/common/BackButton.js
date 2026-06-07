import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiX } from 'react-icons/fi';

/**
 * BackButton — consistent back / close affordance.
 *
 * Props:
 *  - to:       optional path to navigate to. Defaults to navigate(-1) (browser back).
 *  - onClick:  optional custom handler (overrides `to`).
 *  - variant:  'back' (chevron, default) | 'close' (X icon).
 *  - label:    accessible label (default "Go back" / "Close").
 *  - className: extra classes for positioning.
 */
const BackButton = ({ to, onClick, variant = 'back', label, className = '' }) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (onClick) return onClick(e);
    if (to) return navigate(to);
    navigate(-1);
  };

  const Icon = variant === 'close' ? FiX : FiChevronLeft;
  const ariaLabel = label || (variant === 'close' ? 'Close' : 'Go back');

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-1 rounded-xl text-on-surface-variant hover:text-primary hover:bg-secondary-container/30 active:scale-95 transition-all ${className}`}
    >
      <Icon className="w-6 h-6" strokeWidth={2} />
    </button>
  );
};

export default BackButton;
