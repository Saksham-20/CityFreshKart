import React, { useState, useEffect } from 'react';

const Carousel = ({ images = [] }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Default fresh produce banner images
  const defaultImages = [
    {
      title: '🥗 Fresh Vegetables',
      subtitle: 'Delivered Daily to Your Doorstep',
      color: 'from-green-400 to-green-600'
    },
    {
      title: '🍎 Organic Fruits',
      subtitle: 'Sourced from Local Farms',
      color: 'from-red-400 to-orange-600'
    },
    {
      title: '🥬 Daily Fresh',
      subtitle: 'Farm to Table in 24 Hours',
      color: 'from-green-500 to-emerald-600'
    },
    {
      title: '🌾 Best Quality',
      subtitle: 'Guaranteed Freshness',
      color: 'from-yellow-400 to-amber-600'
    }
  ];

  const slides = images.length > 0 ? images : defaultImages;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative w-full h-48 sm:h-64 lg:h-80 rounded-lg overflow-hidden shadow-lg mb-8">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {slide.color ? (
            <div className={`w-full h-full bg-gradient-to-r ${slide.color} flex items-center justify-center`}>
              <div className="text-center text-white">
                <h2 className="text-2xl sm:text-4xl font-bold mb-2">{slide.title}</h2>
                <p className="text-sm sm:text-lg opacity-90">{slide.subtitle}</p>
              </div>
            </div>
          ) : (
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
        aria-label="Previous slide"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
        aria-label="Next slide"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots Navigation */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentSlide
                ? 'bg-white w-8'
                : 'bg-white/50 hover:bg-white/75 w-2'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;
