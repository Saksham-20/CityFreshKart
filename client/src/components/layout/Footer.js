import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaWhatsapp,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt
} from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Shop',
      links: [
        { name: 'Vegetables', href: '/products?category=sabzi-greens' },
        { name: 'Fruits', href: '/products?category=fruits' },
        { name: 'Root Vegetables', href: '/products?category=root-vegetables' },
        { name: 'Exotic & Herbs', href: '/products?category=exotic-herbs' },
        { name: 'Daily Essentials', href: '/products?category=daily-essentials' },
        { name: 'Offers', href: '/products?category=offers' }
      ]
    },
    {
      title: 'Customer Service',
      links: [
        { name: 'Contact Us', href: '/contact' },
        { name: 'Delivery Info', href: '/delivery-info' },
        { name: 'Return Policy', href: '/return-policy' },
        { name: 'FAQ', href: '/faq' },
        { name: 'Track Order', href: '/track-order' }
      ]
    },
    {
      title: 'About',
      links: [
        { name: 'Our Story', href: '/about' },
        { name: 'Our Farmers', href: '/our-farmers' },
        { name: 'Sustainability', href: '/sustainability' },
        { name: 'Careers', href: '/careers' },
        { name: 'Blog', href: '/blog' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Cookie Policy', href: '/cookies' },
        { name: 'Refund Policy', href: '/refund-policy' }
      ]
    }
  ];

  const socialLinks = [
    { name: 'Facebook', icon: FaFacebook, href: process.env.REACT_APP_FACEBOOK_URL || 'https://facebook.com' },
    { name: 'Instagram', icon: FaInstagram, href: process.env.REACT_APP_INSTAGRAM_URL || 'https://instagram.com' },
    { name: 'YouTube', icon: FaYoutube, href: process.env.REACT_APP_YOUTUBE_URL || 'https://youtube.com' },
    { name: 'WhatsApp', icon: FaWhatsapp, href: process.env.REACT_APP_WHATSAPP_URL || 'https://wa.me/919876543210' }
  ];

  const contactInfo = [
    { icon: FaPhone, text: '+91 98765 43210', href: 'tel:+919876543210' },
    { icon: FaEnvelope, text: 'hello@cityfreshkart.in', href: 'mailto:hello@cityfreshkart.in' },
    { icon: FaMapMarkerAlt, text: 'Sector 17, Chandigarh, India 160017', href: '#' }
  ];

  return (
    <footer className="bg-gray-900 text-white">
      {/* Newsletter Section */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <motion.h3
              className="text-3xl font-semibold text-fresh-green mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Get Fresh Deals 🌿
            </motion.h3>
            <motion.p
              className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Get fresh deals & seasonal offers straight to your inbox. Never miss a mandi bargain!
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 px-6 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-fresh-green focus:border-transparent"
              />
              <button className="px-8 py-3 bg-fresh-green hover:bg-fresh-green-dark text-white font-medium rounded-lg transition-colors duration-300">
                Subscribe
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Link to="/" className="inline-block">
                <h2 className="text-2xl font-bold text-fresh-green mb-4">
                  🥦 CityFreshKart
                </h2>
              </Link>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Khet se aapki thali tak — connecting local farmers directly to your kitchen.
                Fresh vegetables & fruits delivered daily across India.
              </p>

              {/* Contact Information */}
              <div className="space-y-3">
                {contactInfo.map((contact, index) => (
                  <motion.a
                    key={index}
                    href={contact.href}
                    className="flex items-center text-gray-400 hover:text-fresh-green transition-colors duration-300"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <contact.icon className="w-4 h-4 mr-3 text-fresh-green" />
                    <span className="text-sm">{contact.text}</span>
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Navigation Sections */}
          {footerSections.map((section, sectionIndex) => (
            <div key={section.title}>
              <motion.h3
                className="text-lg font-semibold text-white mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: sectionIndex * 0.1 }}
              >
                {section.title}
              </motion.h3>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <motion.li
                    key={link.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: (sectionIndex * 0.1) + (linkIndex * 0.05) }}
                  >
                    <Link
                      to={link.href}
                      className="text-gray-400 hover:text-fresh-green transition-colors duration-300 text-sm"
                    >
                      {link.name}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <motion.div
              className="text-gray-400 text-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p>&copy; {currentYear} CityFreshKart. All rights reserved. 🌿 Made in India</p>
            </motion.div>

            {/* Social Links */}
            <motion.div
              className="flex space-x-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-fresh-green rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 + (index * 0.1) }}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.div
            className="flex flex-wrap justify-center items-center space-x-8 text-gray-500 text-sm"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-fresh-green rounded-full"></div>
              <span>100% Fresh</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-fresh-green rounded-full"></div>
              <span>Same-day Delivery</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-fresh-green rounded-full"></div>
              <span>Farmer Direct</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-fresh-green rounded-full"></div>
              <span>Secure Payments</span>
            </div>
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
