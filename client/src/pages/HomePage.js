import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { IoArrowForward, IoStar, IoLeaf, IoTime, IoCheckmarkCircle } from 'react-icons/io5';
import { getFeaturedProducts } from '../data/vegetableProducts';
import LazyImage from '../components/common/LazyImage';
import useCart from '../hooks/useCart';
import QuantitySelector from '../components/ui/QuantitySelector';

const FeaturedProductCard = ({ product }) => {
  const { addToCart, isItemInCart, items: cartItems, updateItemQuantity, removeFromCart } = useCart();

  const productId = product.id;
  const inCart = isItemInCart(productId);
  const cartItem = cartItems?.find(i => (i.product_id || i.id) === productId);
  const qty = cartItem?.quantity || 1;

  const handleAdd = () => {
    addToCart({
      id: productId,
      name: product.name,
      price: product.price,
      primary_image: product.image,
      category_name: product.category
    });
  };

  const handleIncrease = () => cartItem && updateItemQuantity(cartItem.id, qty + 1);
  const handleDecrease = () => {
    if (!cartItem) return;
    if (qty <= 1) removeFromCart(cartItem.id);
    else updateItemQuantity(cartItem.id, qty - 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 overflow-hidden group"
    >
      <div className="relative aspect-square overflow-hidden">
        <LazyImage
          src={product.image}
          alt={product.name}
          className="w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
        {product.weight && (
          <span className="absolute bottom-3 left-3 bg-fresh-green text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            {product.weight}
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="text-[10px] text-fresh-green font-semibold uppercase tracking-wide mb-1">
          {product.category}
        </div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1.5 line-clamp-2 leading-snug">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <IoStar key={i} className={`w-3 h-3 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-200'}`} />
          ))}
          <span className="text-[10px] text-gray-400">({product.reviews})</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-bold text-gray-900">₹{product.price}</span>
          {inCart ? (
            <QuantitySelector quantity={qty} onIncrease={handleIncrease} onDecrease={handleDecrease} size="sm" />
          ) : (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleAdd}
              className="flex items-center gap-1 bg-fresh-green text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-fresh-green-dark transition-colors duration-200 shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const HomePage = () => {
  const featuredProducts = getFeaturedProducts();

  const categories = [
    {
      name: 'Vegetables',
      description: 'Daily fresh vegetables from trusted local farms',
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80',
      href: '/products?category=Vegetables'
    },
    {
      name: 'Fruits',
      description: 'Seasonal fresh fruits daily',
      image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&q=80',
      href: '/products?category=Fruits'
    },
    {
      name: 'Herbs',
      description: 'Fresh herbs for garnish, aroma, and flavor',
      image: 'https://images.unsplash.com/photo-1590868309235-ea34bed7bd7f?w=600&q=80',
      href: '/products?category=Herbs'
    }
  ];

  const stats = [
    { number: '10K+', label: 'Happy Families' },
    { number: '500+', label: 'Local Farmers' },
    { number: '2 Hrs', label: 'Avg Delivery' },
    { number: '100%', label: 'Fresh Guarantee' }
  ];

  const howItWorks = [
    { icon: <IoLeaf className="w-8 h-8" />, title: 'Picked Fresh', desc: 'Harvested from farms every morning' },
    { icon: <IoCheckmarkCircle className="w-8 h-8" />, title: 'Quality Checked', desc: 'Sorted & graded for A-quality' },
    { icon: <IoTime className="w-8 h-8" />, title: 'Packed & Shipped', desc: 'Delivered to your door in hours' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/50 z-10" />
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542838132-92c53300491e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80')" }}
        />

        <div className="relative z-20 text-center text-white px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-4"
          >
            <span className="inline-block bg-saffron/90 text-white px-4 py-1 rounded-full text-sm font-semibold mb-4">
              🥦 India's Freshest Vegetables — Delivered
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold mb-4 text-white drop-shadow-lg"
          >
            Khet Se Aapki Thali Tak
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl mb-6 text-white/90 font-light"
          >
            Farm-fresh vegetables and fruits delivered to your doorstep.
            Same-day delivery — order before 11 AM!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/products"
              className="bg-fresh-green text-white px-6 py-3 rounded-lg text-base font-semibold hover:bg-fresh-green-dark transition-colors duration-300 flex items-center justify-center group"
            >
              🛒 Shop Now
              <IoArrowForward className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>

            <Link
              to="/about"
              className="border-2 border-white text-white px-6 py-3 rounded-lg text-base font-semibold hover:bg-white hover:text-green-900 transition-all duration-300"
            >
              Our Story
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-16 bg-white overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-2xl md:text-3xl font-bold text-fresh-green mb-2">
                  {stat.number}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              How FrashCart Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From farm to your plate in 3 simple steps
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="text-center bg-white rounded-2xl p-8 shadow-soft"
              >
                <div className="w-16 h-16 bg-fresh-green/10 text-fresh-green rounded-full flex items-center justify-center mx-auto mb-4">
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="relative py-20 bg-gray-50 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Today's Fresh Picks 🥬
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Handpicked from local farms this morning — guaranteed fresh or your money back
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.map((product) => (
              <FeaturedProductCard key={product.id} product={product} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link
              to="/products"
              className="inline-flex items-center text-fresh-green hover:text-fresh-green-dark font-semibold text-base group"
            >
              View All Products
              <IoArrowForward className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Shop by Category
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Browse our wide range of farm-fresh produce — delivered daily across India
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="group"
              >
                <Link to={category.href}>
                  <div className="relative overflow-hidden rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <div className="aspect-[4/5] overflow-hidden">
                      <LazyImage
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h3 className="text-lg font-bold mb-1">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-200 mb-3">
                        {category.description}
                      </p>
                      <div className="flex items-center text-fresh-green-light font-semibold text-sm group-hover:translate-x-2 transition-transform duration-200">
                        Shop Now
                        <IoArrowForward className="ml-2" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-fresh-green to-fresh-green-dark">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-white mb-6"
          >
            Taza Sabzi, Har Din — Ghar Baithe Order Karo! 🌿
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-white/90 mb-8"
          >
            Join thousands of happy families who get fresh vegetables delivered daily.
            Free delivery on orders above ₹199!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/register"
              className="bg-white text-fresh-green px-6 py-3 rounded-lg text-base font-semibold hover:bg-gray-100 transition-colors duration-300"
            >
              Create Account
            </Link>

            <Link
              to="/products"
              className="border-2 border-white text-white px-6 py-3 rounded-lg text-base font-semibold hover:bg-white hover:text-fresh-green transition-all duration-300"
            >
              Start Shopping 🛒
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
