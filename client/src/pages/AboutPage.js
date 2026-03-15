import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { IoArrowForward, IoLeaf, IoHeart, IoEarth } from 'react-icons/io5';

const AboutPage = () => {
  const values = [
    {
      icon: <IoLeaf className="w-8 h-8 text-fresh-green" />,
      title: 'Freshness First',
      description: 'Every vegetable is harvested the same morning it reaches your kitchen. No cold storage, no chemicals — just pure, farm-fresh goodness.'
    },
    {
      icon: <IoHeart className="w-8 h-8 text-fresh-green" />,
      title: 'Farmer First',
      description: 'We work directly with 500+ local farmers across India, ensuring fair prices and sustainable livelihoods for the people who feed us.'
    },
    {
      icon: <IoEarth className="w-8 h-8 text-fresh-green" />,
      title: 'Sustainability',
      description: 'Eco-friendly packaging, zero-waste supply chain, and support for organic farming — because the planet matters as much as the produce.'
    }
  ];

  const milestones = [
    { year: '2023', title: 'FrashCart Founded', description: 'Started with a simple idea — connecting local farmers directly to urban families in Chandigarh' },
    { year: '2023', title: 'First 1,000 Orders', description: 'Reached our first milestone within 3 months of launch' },
    { year: '2024', title: 'Farmer Network', description: 'Expanded to 200+ partner farmers across Punjab, Haryana & Himachal' },
    { year: '2024', title: 'App Launch', description: 'Launched our mobile app for seamless ordering and tracking' },
    { year: '2025', title: 'Pan-India Vision', description: 'Expanding to 10+ cities with same-day delivery infrastructure' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-green-50 to-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            >
              About FrashCart 🥦
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg text-gray-600 max-w-3xl mx-auto"
            >
              We're an Indian startup on a mission to bring the freshest produce from local farms
              straight to your kitchen — no middlemen, no delays, just pure freshness.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Our Story
              </h2>
              <p className="text-base text-gray-600 mb-4">
                FrashCart was born in 2023 from a simple frustration — why does it take 3 days
                for a tomato to travel from a farm 50km away to our kitchen? Along the way, it
                passes through 4-5 middlemen, losing freshness and doubling in price.
              </p>
              <p className="text-base text-gray-600 mb-6">
                We decided to cut the noise. FrashCart connects local farmers directly to your
                doorstep. Our team visits farms every morning, handpicks the best produce, and
                delivers it to you within hours — not days. Better for you, better for farmers,
                better for India. 🇮🇳
              </p>
              <Link
                to="/products"
                className="inline-flex items-center text-fresh-green hover:text-fresh-green-dark font-semibold text-base group"
              >
                Start Shopping
                <IoArrowForward className="ml-2 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-square bg-gradient-to-br from-fresh-green/10 to-fresh-green/5 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-fresh-green/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <IoLeaf className="w-12 h-12 text-fresh-green" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Since 2023</h3>
                  <p className="text-sm text-gray-600">Delivering freshness across India</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Our Values
            </h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              These principles drive every decision we make — from farm to your plate.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  {value.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Our Journey
            </h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              From a Chandigarh garage to delivering across India — here's our story so far.
            </p>
          </motion.div>

          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <motion.div
                key={milestone.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className={`flex flex-col md:flex-row items-center gap-6 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
              >
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-fresh-green text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {milestone.year}
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {milestone.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {milestone.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-fresh-green to-fresh-green-dark">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-white mb-4"
          >
            Join the FrashCart Family 🌿
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-white/90 mb-8"
          >
            Experience the difference that truly fresh produce makes. Order today and taste the farm.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/products"
              className="bg-white text-fresh-green px-6 py-3 rounded-lg text-base font-semibold hover:bg-gray-100 transition-colors duration-300"
            >
              Shop Now 🛒
            </Link>
            <Link
              to="/register"
              className="border-2 border-white text-white px-6 py-3 rounded-lg text-base font-semibold hover:bg-white hover:text-fresh-green transition-all duration-300"
            >
              Create Account
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
