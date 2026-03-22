import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useCart from '../hooks/useCart';
import { getImageUrl, getPlaceholderImage, IMAGE_DIMS } from '../utils/imageUtils';
import { formatCartQuantityLabel } from '../utils/weightSystem';

const GRAM_STEP_KG = 0.05; // 50g steps for variable weight (e.g. watermelon)
const PIECE_STEP = 1;
const FREE_DELIVERY_THRESHOLD = 300;

const CartPage = () => {
  const navigate = useNavigate();
  const { items, removeFromCart, updateItemQuantity, calculateSummary } = useCart();
  const { subtotal, deliveryFee, total } = calculateSummary();

  const amountToFree = Math.max(FREE_DELIVERY_THRESHOLD - subtotal, 0);
  const deliveryProgress = Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100);

  const stepFor = (item) => (item.pricing_type === 'per_piece' ? PIECE_STEP : GRAM_STEP_KG);
  const minQtyFor = (item) => (item.pricing_type === 'per_piece' ? PIECE_STEP : GRAM_STEP_KG);

  const handleIncrease = (item) => {
    const step = stepFor(item);
    updateItemQuantity(item.id, parseFloat((item.quantity + step).toFixed(2)));
  };
  const handleDecrease = (item) => {
    const step = stepFor(item);
    const minQ = minQtyFor(item);
    const newQty = parseFloat((item.quantity - step).toFixed(2));
    if (newQty < minQ - 1e-6) removeFromCart(item.id);
    else updateItemQuantity(item.id, newQty);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-surface pt-14 flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="text-6xl mb-5">🛒</div>
          <h2 className="text-xl font-headline font-bold text-on-surface mb-2">Your cart is empty</h2>
          <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
            Start adding fresh vegetables, fruits and more!
          </p>
          <Link
            to="/"
            className="inline-block bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold px-8 py-3 rounded-full text-sm transition-opacity shadow-primary-glow hover:opacity-95"
          >
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pt-14 pb-[12rem] sm:pb-36">
      <div className="max-w-lg mx-auto px-0 sm:px-4 py-3 sm:py-4">

        {/* Delivery info banner */}
        <div className="mx-3 sm:mx-0 mb-3 bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/10 overflow-hidden shadow-editorial">
          {deliveryFee > 0 ? (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-on-surface">
                  Add <span className="text-primary font-bold">₹{amountToFree.toFixed(0)}</span> more for free delivery
                </p>
                <span className="text-[10px] text-on-surface-variant">{Math.round(deliveryProgress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-container rounded-full transition-all duration-500"
                  style={{ width: `${deliveryProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 flex items-center gap-2 bg-secondary-container/20">
              <span className="text-primary font-bold text-sm">🎉</span>
              <p className="text-xs font-bold text-primary">You&apos;ve unlocked FREE delivery!</p>
            </div>
          )}
        </div>

        {/* Delivery time bar */}
        <div className="mx-3 sm:mx-0 mb-3 bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/10 px-4 py-3 flex items-center gap-3 shadow-editorial">
          <span className="material-symbols-outlined text-primary text-2xl">bolt</span>
          <div>
            <p className="text-sm font-bold text-on-surface">Delivery in 30 minutes</p>
            <p className="text-xs text-on-surface-variant">Fresh to your doorstep</p>
          </div>
        </div>

        {/* Cart items */}
        <div className="mx-3 sm:mx-0 bg-surface-container-lowest rounded-2xl outline outline-1 outline-outline-variant/10 divide-y divide-surface-container overflow-hidden shadow-editorial">
          <div className="px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-headline font-bold text-on-surface">Your Items</h2>
            <span className="text-xs text-on-surface-variant">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
          </div>

          {items.map((item) => {
            const isPerPiece = item.pricing_type === 'per_piece';
            const pricePerKg = item.price_per_kg || 0;
            const discountedPricePerKg = item.discount ? pricePerKg * (1 - item.discount / 100) : pricePerKg;
            const lineTotal = (discountedPricePerKg * item.quantity).toFixed(2);
            const unitLabel = isPerPiece ? '/pc' : '/kg';

            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                {/* Image */}
                <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-surface-container-low outline outline-1 outline-outline-variant/10">
                  <img
                    src={getImageUrl(item.image_url)}
                    alt={item.name}
                    width={IMAGE_DIMS.cartLineSm.width}
                    height={IMAGE_DIMS.cartLineSm.height}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.target.src = getPlaceholderImage(); }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="text-sm font-semibold text-on-surface truncate pr-1">{item.name}</h3>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="flex-shrink-0 text-on-surface-variant hover:text-error transition-colors p-0.5 -mt-0.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    ₹{pricePerKg}{unitLabel}{item.discount > 0 ? ` · ${item.discount}% off` : ''}
                  </p>

                  <div className="flex items-center justify-between mt-1.5">
                    {/* Qty / weight control — 50g steps for per-kg */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center bg-gradient-to-r from-primary to-primary-container rounded-lg overflow-hidden shadow-primary-glow">
                        <button
                          type="button"
                          onClick={() => handleDecrease(item)}
                          className="w-7 h-6 flex items-center justify-center text-on-primary text-sm font-bold hover:opacity-90 transition-opacity"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="text-on-primary text-[11px] font-bold px-2 min-w-[3.25rem] text-center">
                          {formatCartQuantityLabel(item)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIncrease(item)}
                          className="w-7 h-6 flex items-center justify-center text-on-primary text-sm font-bold hover:opacity-90 transition-opacity"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      {!isPerPiece && (
                        <span className="text-[10px] text-on-surface-variant">±50g · exact weight pricing</span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-on-surface">₹{lineTotal}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue shopping */}
        <div className="mx-3 sm:mx-0 mt-3">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-primary font-medium hover:opacity-80">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Continue Shopping
          </Link>
        </div>
      </div>

      {/* Sticky bottom checkout bar */}
      <div
        className="fixed bottom-0 left-0 right-0 glass-header border-t border-outline-variant/10 px-4 pt-3 pb-5 z-50 shadow-editorial"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        {/* Price summary */}
        <div className="flex items-center justify-between mb-3 text-sm">
          <div className="flex items-center gap-3 text-on-surface-variant">
            <span>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
            <span>·</span>
            <span>Delivery: <span className={deliveryFee === 0 ? 'text-primary font-bold' : 'font-medium text-on-surface'}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></span>
          </div>
          <div className="text-right">
            <span className="text-base font-extrabold text-on-surface">₹{total.toFixed(2)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/checkout')}
          className="w-full bg-gradient-to-r from-primary to-primary-container hover:opacity-95 text-on-primary font-bold py-3.5 rounded-full text-base transition-opacity shadow-primary-glow"
        >
          Proceed to Checkout →
        </button>
      </div>
    </div>
  );
};

export default CartPage;
