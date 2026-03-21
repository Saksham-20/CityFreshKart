import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { getImageUrl, getPlaceholderImage, IMAGE_DIMS } from '../../utils/imageUtils';

const ProductSlide = ({ product }) => {
  if (!product) return null;

  const discount = Number(product.discount || 0);
  const stock = product.quantity_available ?? product.stock_quantity ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
        <img
          src={getImageUrl(product.image_url) || getPlaceholderImage()}
          alt={product.name}
          width={IMAGE_DIMS.product4x3.width}
          height={IMAGE_DIMS.product4x3.height}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = getPlaceholderImage();
          }}
        />

        {discount > 0 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold">
            Save {Math.round(discount)}%
          </div>
        )}

        {typeof stock === 'number' && stock <= 0 && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-gray-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
          {product.name}
        </h3>

        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-600">
            ₹{Number(product.price_per_kg || 0).toFixed(0)}/kg
          </div>
          {discount > 0 ? (
            <div className="text-xs text-red-600 font-bold">{discount}% off</div>
          ) : (
            <div className="text-xs text-green-700 font-bold">Fresh</div>
          )}
        </div>
      </div>
    </div>
  );
};

const CarouselSection = ({ title, subtitle, items }) => {
  const slides = useMemo(() => items || [], [items]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setCurrent(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides || slides.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="relative carousel">
        <div className="px-1">
          <ProductSlide product={slides[current]} />
        </div>

        {/* Navigation */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 border border-gray-200 rounded-full p-2 shadow-sm"
              aria-label="Previous slide"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 border border-gray-200 rounded-full p-2 shadow-sm"
              aria-label="Next slide"
            >
              ›
            </button>
          </>
        )}

        {/* Dots */}
        {slides.length > 1 && (
          <div className="flex gap-2 justify-center mt-3">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrent(idx)}
                className={`h-2 rounded-full transition-all ${idx === current ? 'bg-green-600 w-8' : 'bg-gray-300 w-2'}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DiscountFreshCarousel = () => {
  const [discounted, setDiscounted] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/products/carousel');
        if (!mounted) return;
        setDiscounted(res.data?.data?.discounted || []);
        setNewProducts(res.data?.data?.new_products || res.data?.data?.fresh || []);
      } catch (e) {
        if (!mounted) return;
        setError('Failed to load carousel items');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="h-6 bg-gray-100 rounded w-2/3 mb-3 animate-pulse" />
        <div className="h-40 bg-gray-50 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return null;
  }

  return (
    <div className="space-y-8 mb-8">
      <CarouselSection
        title="Discounted Deals"
        subtitle="Fresh picks with discounts"
        items={discounted}
      />

      <CarouselSection
        title="New Products"
        subtitle="Recently added in the last 24 hours"
        items={newProducts}
      />
    </div>
  );
};

export default DiscountFreshCarousel;

