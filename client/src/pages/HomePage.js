import React, { useState } from 'react';
import { motion } from 'framer-motion';
import OfferCarousel from '../components/home/OfferCarousel';
import CategoryFilter from '../components/home/CategoryFilter';
import ProductCard from '../components/product/ProductCard';
import useProducts from '../hooks/useProducts';
import Loading from '../components/ui/Loading';

const HomePage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Fetch products from API or use fallback
  const { products, isLoading, error } = useProducts();

  // Filter products by category
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => {
        const category = (p.category || p.category_name || '').toLowerCase();
        return category.includes(selectedCategory);
      });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-fresh-green text-white px-6 py-2 rounded-lg hover:bg-fresh-green-dark"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Offer Carousel */}
      <section className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <OfferCarousel />
        </motion.div>
      </section>

      {/* Categories */}
      <section className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 px-4 sm:px-0">
            🛍️ Shop by Category
          </h2>
          <CategoryFilter
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </motion.div>
      </section>

      {/* Products Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 max-w-7xl mx-auto">
        {isLoading ? (
          <Loading />
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No products found in this category</p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="bg-fresh-green text-white px-6 py-2 rounded-lg hover:bg-fresh-green-dark"
            >
              View All Products
            </button>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
          >
            {filteredProducts.map((product) => (
              <motion.div key={product.id || product.product_id} variants={itemVariants}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Quick Info Banner */}
      <section className="bg-fresh-green-light px-4 sm:px-6 lg:px-8 py-6 sm:py-8 mt-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: '🚚', title: 'Free Delivery', desc: 'Above ₹300' },
              { icon: '⚡', title: 'Express Delivery', desc: '30 mins avg' },
              { icon: '✅', title: 'Fresh Guarantee', desc: '100% fresh' },
              { icon: '🌱', title: 'Direct from Farms', desc: 'No middlemen' }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="text-center"
              >
                <div className="text-3xl sm:text-4xl mb-2">{item.icon}</div>
                <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{item.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
