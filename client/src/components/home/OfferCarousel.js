import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const OfferCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      title: 'Fresh Vegetables Delivered Today',
      subtitle: 'Farm-to-table in 30 minutes',
      gradient: 'from-green-400 to-green-600',
      emoji: '🥬'
    },
    {
      id: 2,
      title: 'Free Delivery Above ₹300',
      subtitle: 'Order now and save on delivery',
      gradient: 'from-blue-400 to-blue-600',
      emoji: '🚚'
    },
    {
      id: 3,
      title: 'Freshest Fruits Every Day',
      subtitle: 'Premium quality guaranteed',
      gradient: 'from-orange-400 to-orange-600',
      emoji: '🍎'
    },
    {
      id: 4,
      title: 'Organic & Natural Products',
      subtitle: 'No pesticides, no chemicals',
      gradient: 'from-yellow-400 to-yellow-600',
      emoji: '🌱'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Auto-rotate every 5 seconds

    return () => clearInterval(timer);
  }, [slides.length]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div className="relative w-full h-48 sm:h-56 md:h-64 rounded-2xl overflow-hidden bg-gradient-to-r from-green-50 to-green-100">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`absolute inset-0 bg-gradient-to-r ${slides[currentSlide].gradient} flex items-center justify-between px-6 sm:px-8 md:px-12`}
        >
          {/* Left content */}
          <div className="flex-1 text-white z-10">
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2"
            >
              {slides[currentSlide].title}
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm sm:text-base text-white/90"
            >
              {slides[currentSlide].subtitle}
            </motion.p>
          </div>

          {/* Right emoji - hidden on mobile */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="hidden sm:flex items-center justify-center text-6xl md:text-8xl ml-4"
          >
            {slides[currentSlide].emoji}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all duration-200"
        aria-label="Previous slide"
      >
        <ChevronLeft size={20} />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all duration-200"
        aria-label="Next slide"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'bg-white w-8'
                : 'bg-white/50 w-2 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default OfferCarousel;
