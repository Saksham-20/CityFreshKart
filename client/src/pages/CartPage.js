import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useCart from '../hooks/useCart';
import { getImageUrl, getPlaceholderImage, IMAGE_DIMS } from '../utils/imageUtils';
import {
  formatCartQuantityLabel,
  getCartLinePricing,
  getCartLineTotal,
  getTierWeightsFromOverrides,
} from '../utils/weightSystem';
import { useCartStore } from '../store/useCartStore';

const GRAM_STEP_KG = 0.05; // fallback step when no explicit tiers
const PIECE_STEP = 1;

const CartPage = () => {
  const navigate = useNavigate();
  const { items, removeFromCart, removeProductFromCart, updateItemQuantity, adjustPackCount, calculateSummary } = useCart();
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // Subscribe to cart store to get fresh settings values
  const freeDeliveryThreshold = useCartStore((state) => state.freeDeliveryThreshold);
  
  const { subtotal, deliveryFee, total } = calculateSummary();

  // Load settings when cart page mounts
  useEffect(() => {
    (async () => {
      try {
        await useCartStore.getState().loadSettings();
        setSettingsLoaded(true);
      } catch (e) {
        console.error('Failed to load settings', e);
        setSettingsLoaded(true); // Still proceed with defaults
      }
    })();
  }, []);

  const amountToFree = Math.max(freeDeliveryThreshold - subtotal, 0);
  const deliveryProgress = Math.min((subtotal / freeDeliveryThreshold) * 100, 100);

  const tierOptionsFor = (item) => (
    item.pricing_type === 'per_piece'
      ? []
      : getTierWeightsFromOverrides(item.weight_price_overrides || {})
  );

  const stepFor = (item) => (item.pricing_type === 'per_piece' ? PIECE_STEP : GRAM_STEP_KG);
  const minQtyFor = (item) => (item.pricing_type === 'per_piece' ? PIECE_STEP : GRAM_STEP_KG);

  const lineKeyFor = (item) => item.lineId || item.id;

  // Group cart lines by product id so different weight tiers show as one row on UI.
  const groupedItems = React.useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return [];

    const byProduct = new Map();
    items.forEach((item) => {
      const pid = item.id;
      if (pid == null) return;
      if (!byProduct.has(pid)) byProduct.set(pid, []);
      byProduct.get(pid).push(item);
    });

    const groups = Array.from(byProduct.entries()).map(([productId, lines]) => {
      const sorted = [...lines].sort((a, b) => Number(b.quantity) - Number(a.quantity));
      const primaryLine = sorted[0];
      const primaryKey = lineKeyFor(primaryLine);

      const isPerPiece = primaryLine.pricing_type === 'per_piece';
      const tierWeights = isPerPiece ? [] : tierOptionsFor(primaryLine);
      const hasTiers = tierWeights.length > 0;

      const packsFor = (l) => Math.max(1, parseInt(l.packCount, 10) || 1);
      const mergedQuantity = lines.reduce((sum, l) => {
        const q = Number(l.quantity) || 0;
        return sum + q * packsFor(l);
      }, 0);

      const mergedLabelItem = isPerPiece
        ? { pricing_type: 'per_piece', quantity: mergedQuantity, packCount: 1 }
        : {
          pricing_type: primaryLine.pricing_type,
          quantity: mergedQuantity,
          packCount: 1,
          weight_display_unit: primaryLine.weight_display_unit,
        };

      const mergedQuantityLabel = formatCartQuantityLabel(mergedLabelItem);
      const mergedLineTotal = lines.reduce((sum, l) => sum + getCartLineTotal(l), 0);

      const mergedBasePriceTotal = hasTiers
        ? lines.reduce((sum, l) => sum + getCartLinePricing(l).basePrice, 0)
        : 0;

      return {
        productId,
        name: primaryLine.name,
        image_url: primaryLine.image_url,
        pricing_type: primaryLine.pricing_type,
        price_per_kg: primaryLine.price_per_kg || 0,
        discount: primaryLine.discount || 0,
        weight_display_unit: primaryLine.weight_display_unit,
        primaryLine,
        primaryKey,
        isPerPiece,
        hasTiers,
        mergedQuantityLabel,
        mergedLineTotal,
        mergedBasePriceTotal,
      };
    });

    return groups;
  }, [items]);

  const handleIncreaseGroup = (group) => {
    if (!group) return;
    if (group.hasTiers && !group.isPerPiece) {
      // For admin tier products, just add one more pack of the highest tier.
      adjustPackCount(group.primaryKey, 1);
      return;
    }

    const step = stepFor(group.primaryLine);
    updateItemQuantity(group.primaryKey, parseFloat((group.primaryLine.quantity + step).toFixed(2)));
  };

  const handleDecreaseGroup = (group) => {
    if (!group) return;
    if (group.hasTiers && !group.isPerPiece) {
      // For admin tier products, subtract one pack from the highest tier.
      // Store will remove the line if packCount would drop below 1.
      adjustPackCount(group.primaryKey, -1);
      return;
    }

    const step = stepFor(group.primaryLine);
    const minQ = minQtyFor(group.primaryLine);
    const newQty = parseFloat((group.primaryLine.quantity - step).toFixed(2));
    if (newQty < minQ - 1e-6) removeFromCart(group.primaryKey);
    else updateItemQuantity(group.primaryKey, newQty);
  };

  const handleRemoveGroup = (group) => {
    if (!group) return;
    removeProductFromCart(group.productId);
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
          <span className="text-xs text-on-surface-variant">{groupedItems.length} {groupedItems.length === 1 ? 'item' : 'items'}</span>
          </div>

        {groupedItems.map((group) => {
          const unitLabel = group.isPerPiece ? '/pc' : '/kg';
          const priceMeta = group.hasTiers
            ? `₹${Number.isInteger(group.mergedBasePriceTotal) ? group.mergedBasePriceTotal : group.mergedBasePriceTotal.toFixed(2)} for ${group.mergedQuantityLabel}`
            : `₹${group.price_per_kg}${unitLabel}`;
          const discountSuffix = group.discount > 0 ? ` · ${group.discount}% off` : '';
          const lineTotal = group.mergedLineTotal.toFixed(2);

          return (
            <div key={group.productId} className="flex items-center gap-3 px-4 py-3">
                {/* Image */}
                <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-surface-container-low outline outline-1 outline-outline-variant/10">
                  <img
                  src={getImageUrl(group.image_url)}
                  alt={group.name}
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
                  <h3 className="text-sm font-semibold text-on-surface truncate pr-1">{group.name}</h3>
                    <button
                      type="button"
                    onClick={() => handleRemoveGroup(group)}
                      className="flex-shrink-0 text-on-surface-variant hover:text-error transition-colors p-0.5 -mt-0.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {priceMeta}{discountSuffix}
                  </p>

                  <div className="flex items-center justify-between mt-1.5">
                    {/* Qty / weight control — 50g steps for per-kg */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center bg-gradient-to-r from-primary to-primary-container rounded-lg overflow-hidden shadow-primary-glow">
                        <button
                          type="button"
                          onClick={() => handleDecreaseGroup(group)}
                          className="w-7 h-6 flex items-center justify-center text-on-primary text-sm font-bold hover:opacity-90 transition-opacity"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="text-on-primary text-[11px] font-bold px-2 min-w-[3.25rem] text-center">
                          {group.mergedQuantityLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIncreaseGroup(group)}
                          className="w-7 h-6 flex items-center justify-center text-on-primary text-sm font-bold hover:opacity-90 transition-opacity"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      {!group.isPerPiece && (
                        <span className="text-[10px] text-on-surface-variant">
                          {group.hasTiers ? 'Admin tier weights' : '±50g · exact weight pricing'}
                        </span>
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
            <span>{groupedItems.length} {groupedItems.length === 1 ? 'item' : 'items'}</span>
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
