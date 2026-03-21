import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getImageUrl, IMAGE_DIMS } from '../../utils/imageUtils';

const isExternalUrl = (url) => /^https?:\/\//i.test(String(url || '').trim());

const normalizeInternalPath = (url) => {
  const t = String(url || '').trim();
  if (!t) return '';
  if (isExternalUrl(t)) return t;
  return t.startsWith('/') ? t : `/${t}`;
};

const SlideLink = ({ href, className, children }) => {
  const t = String(href || '').trim();
  if (!t) {
    return <div className={className}>{children}</div>;
  }
  if (isExternalUrl(t)) {
    return (
      <a
        href={t}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }
  const to = normalizeInternalPath(t);
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
};

const OffersCarousel = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/marketing/banners');
        const list = res.data?.data?.banners || [];
        if (!cancelled) setBanners(Array.isArray(list) ? list : []);
      } catch (_) {
        if (!cancelled) setBanners([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const n = banners.length;
  const go = useCallback((delta) => {
    if (n <= 1) return;
    setActiveIndex((i) => (i + delta + n) % n);
  }, [n]);

  useEffect(() => {
    if (n <= 1) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n, go]);

  useEffect(() => {
    setActiveIndex((i) => (n ? Math.min(i, n - 1) : 0));
  }, [n]);

  if (loading) {
    return (
      <section className="mb-6 md:mb-8" aria-busy="true">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="h-6 w-48 bg-surface-container-low rounded-lg animate-pulse" />
        </div>
        <div className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="w-full aspect-[2/1] rounded-3xl bg-surface-container-low animate-pulse" />
        </div>
      </section>
    );
  }

  if (!banners.length) return null;

  return (
    <section className="mb-6 md:mb-8" aria-label="Offers and promotions">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-headline text-lg md:text-xl font-bold text-on-surface">Offers &amp; deals</h2>
      </div>

      <div className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div
        className="relative w-full aspect-[2/1] rounded-3xl overflow-hidden shadow-editorial outline outline-1 outline-outline-variant/15 group/carousel"
        onTouchStart={(e) => {
          const x0 = e.touches[0].clientX;
          const onEnd = (ev) => {
            const x1 = ev.changedTouches[0].clientX;
            const dx = x1 - x0;
            if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
            window.removeEventListener('touchend', onEnd);
          };
          window.addEventListener('touchend', onEnd, { once: true });
        }}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{
            width: `${n * 100}%`,
            transform: `translateX(-${(activeIndex * 100) / n}%)`,
          }}
        >
          {banners.map((b) => {
            const img = getImageUrl(b.image_url);
            const hasLink = Boolean(String(b.link_url || '').trim());
            const inner = (
              <>
                <img
                  src={img}
                  alt=""
                  width={IMAGE_DIMS.marketingBanner.width}
                  height={IMAGE_DIMS.marketingBanner.height}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 text-left pb-10 md:pb-11">
                  {b.title ? (
                    <p className="text-white font-headline font-bold text-lg md:text-xl leading-tight drop-shadow-sm">
                      {b.title}
                    </p>
                  ) : null}
                  {b.subtitle ? (
                    <p className="text-white/90 text-sm mt-1 line-clamp-2 max-w-xl">
                      {b.subtitle}
                    </p>
                  ) : null}
                  {hasLink ? (
                    <span className="inline-flex mt-3 text-xs font-bold uppercase tracking-widest text-primary-fixed">
                      Tap to open →
                    </span>
                  ) : null}
                </div>
              </>
            );
            return (
              <div
                key={b.id}
                className="relative h-full flex-shrink-0"
                style={{ width: `${100 / n}%` }}
              >
                <SlideLink
                  href={b.link_url}
                  className={`absolute inset-0 block overflow-hidden rounded-3xl ${
                    hasLink ? 'cursor-pointer active:scale-[0.995] transition-transform' : 'cursor-default'
                  }`}
                >
                  {inner}
                </SlideLink>
              </div>
            );
          })}
        </div>

        {n > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous offer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-2 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-sm transition-opacity duration-200 opacity-0 pointer-events-none group-hover/carousel:opacity-100 group-hover/carousel:pointer-events-auto group-focus-within/carousel:opacity-100 group-focus-within/carousel:pointer-events-auto [@media(hover:none)]:opacity-40 [@media(hover:none)]:pointer-events-auto hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>chevron_left</span>
            </button>
            <button
              type="button"
              aria-label="Next offer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-2 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-sm transition-opacity duration-200 opacity-0 pointer-events-none group-hover/carousel:opacity-100 group-hover/carousel:pointer-events-auto group-focus-within/carousel:opacity-100 group-focus-within/carousel:pointer-events-auto [@media(hover:none)]:opacity-40 [@media(hover:none)]:pointer-events-auto hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>chevron_right</span>
            </button>

            <div
              className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5"
              role="tablist"
              aria-label="Offer slides"
            >
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`Slide ${i + 1} of ${n}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveIndex(i);
                  }}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    i === activeIndex
                      ? 'w-6 bg-white shadow-sm'
                      : 'w-2 bg-white/45 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
      </div>
    </section>
  );
};

export default OffersCarousel;
