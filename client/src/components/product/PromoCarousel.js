import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getImageUrl, IMAGE_DIMS } from '../../utils/imageUtils';
import { formatWeightDisplay } from '../../utils/weightSystem';

const PromoCarousel = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/products/carousel?limit=12');
        const list = res.data?.data?.items || res.data?.data?.products || [];
        if (!cancelled) setItems(Array.isArray(list) ? list : []);
      } catch (_) {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="mb-6 md:mb-8" aria-busy="true">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="h-6 w-40 bg-surface-container-low rounded-lg animate-pulse" />
          <div className="h-4 w-14 bg-surface-container-low rounded animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-hidden pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {[1, 2].map((k) => (
            <div key={k} className="flex-none w-[280px] h-[168px] rounded-3xl bg-surface-container-low animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section className="mb-6 md:mb-8" aria-label="Promotions and new arrivals">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-headline text-lg md:text-xl font-bold text-on-surface">Daily Highlights</h2>
        <Link
          to="/?highlights=1"
          className="text-primary text-xs font-bold uppercase tracking-widest hover:opacity-80"
        >
          See all
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 scrollbar-hide snap-x snap-mandatory scroll-pl-4">
        {items.map((product) => {
          const price = Number(product.price_per_kg) || 0;
          const d = Number(product.discount) || 0;
          const effective = d > 0 ? price * (1 - d / 100) : price;
          const isDisc = product.is_discounted && d > 0;
          const isNew = product.is_new;
          const cardTone = isDisc
            ? 'bg-secondary-container/20 outline outline-1 outline-secondary-container/30'
            : 'bg-primary-fixed/20 outline outline-1 outline-primary-fixed/30';

          // Calculate lowest price from tiers based on pricing type
          const overrides = product.weight_price_overrides || {};
          let pricingType = product.pricing_type || 'per_kg';
          let displayPrice = effective;
          let displayWeight = 1;
          let displayUnit = 'kg';
          
          if (Object.keys(overrides).length > 0) {
            const tiers = Object.keys(overrides)
              .map((k) => parseFloat(k))
              .filter((n) => Number.isFinite(n) && n > 0)
              .sort((a, b) => a - b);
            if (tiers.length > 0) {
              displayWeight = tiers[0];
              const tierPrice = Number(overrides[displayWeight.toFixed(2)]) || (price * displayWeight);
              displayPrice = d > 0 ? tierPrice * (1 - d / 100) : tierPrice;
              
              // Detect if overrides represent piece quantities (small whole numbers like 3, 6, 12)
              const isPieceBasedOverrides = tiers.every(t => 
                Number.isInteger(t) && t >= 1 && t <= 100
              );
              if (isPieceBasedOverrides && pricingType === 'per_kg') {
                pricingType = 'per_piece';
              }
            }
          }
          
          if (pricingType === 'per_piece') {
            displayUnit = 'pc';
          } else {
            displayUnit = product.weight_display_unit || 'kg';
          }

          let badge = null;
          if (isDisc) {
            badge = (
              <span className="bg-tertiary text-on-tertiary text-[10px] font-black px-3 py-1.5 rounded-bl-2xl uppercase tracking-tighter">
                {Math.round(d)}% off
              </span>
            );
          } else if (isNew) {
            badge = (
              <span className="bg-primary text-on-primary text-[10px] font-black px-3 py-1.5 rounded-bl-2xl uppercase tracking-tighter">
                New
              </span>
            );
          } else if (product.is_featured) {
            badge = (
              <span className="bg-secondary text-on-secondary text-[10px] font-black px-3 py-1.5 rounded-bl-2xl uppercase tracking-tighter">
                Featured
              </span>
            );
          }

          return (
            <div
              key={product.id}
              className={`flex-none w-[280px] rounded-3xl p-5 relative overflow-hidden snap-center shadow-editorial ${cardTone}`}
            >
              {badge && <div className="absolute top-0 right-0 z-[1]">{badge}</div>}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block mb-1">
                    {isDisc ? 'Deal' : isNew ? 'Newly added' : 'Pick'}
                  </span>
                  <h3 className="font-headline font-extrabold text-on-surface text-base leading-tight mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline gap-1.5 mb-3">
                    <span className="text-on-surface-variant text-[10px] font-medium">From</span>
                    <span className="text-primary font-extrabold text-xl">₹{displayPrice.toFixed(0)}</span>
                    <span className="text-on-surface-variant text-[10px] font-medium">
                      / {pricingType === 'per_piece' ? `${Math.round(displayWeight)} ${displayWeight === 1 ? 'pc' : 'pcs'}` : `${displayWeight}${displayUnit}`}
                    </span>
                  </div>
                  <Link
                    to={`/?highlight=${encodeURIComponent(product.id)}`}
                    className="inline-flex bg-primary text-on-primary text-[10px] font-bold px-4 py-2 rounded-full active:scale-95 transition-transform shadow-primary-glow"
                  >
                    View
                  </Link>
                </div>
                <div className="w-24 h-24 flex-none relative">
                  <img
                    alt=""
                    src={getImageUrl(product.image_url)}
                    width={IMAGE_DIMS.promoThumb.width}
                    height={IMAGE_DIMS.promoThumb.height}
                    className="w-full h-full object-contain drop-shadow-xl product-image-offset"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22120%22 height=%22120%22 rx=%2212%22/%3E%3Ctext x=%2250%25%22 y=%2252%25%22 font-size=%2240%22 text-anchor=%22middle%22%3E%F0%9F%A5%AC%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PromoCarousel;
