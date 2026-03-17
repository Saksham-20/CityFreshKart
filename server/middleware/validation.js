const { body, param, query, validationResult } = require('express-validator');

// Middleware to check for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+91[0-9]{10}$/).withMessage('Enter a valid 10-digit Indian mobile number'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  handleValidationErrors,
];

// User login validation
const validateLogin = [
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+91[0-9]{10}$/).withMessage('Enter a valid 10-digit Indian mobile number'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

// Product creation/update validation
const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Product name must be between 3 and 255 characters'),
  body('slug')
    .trim()
    .isLength({ min: 3, max: 255 })
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('compare_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Compare price must be a positive number'),
  body('sku')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('SKU must be between 3 and 100 characters'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('category_id')
    .isUUID()
    .withMessage('Valid category ID is required'),
  handleValidationErrors,
];

// Product search/listing validation
const validateProductQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('category')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Category must not be empty'),
  query('brand')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Brand must not be empty'),
  query('min_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  query('max_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  query('sort')
    .optional()
    .isIn(['name', 'price', 'created_at', 'rating'])
    .withMessage('Sort must be one of: name, price, created_at, rating'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be either asc or desc'),
  handleValidationErrors,
];

// Review validation
const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Review title must be between 3 and 255 characters'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review comment must be less than 1000 characters'),
  handleValidationErrors,
];

// Address validation
const validateAddress = [
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('address_line_1')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Address line 1 must be between 5 and 255 characters'),
  body('city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  body('state')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  body('postal_code')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Postal code must be between 3 and 20 characters'),
  body('country')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .isLength({ min: 7 })
    .withMessage('Please provide a valid phone number'),
  handleValidationErrors,
];

// Order validation
const validateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.product_id')
    .isUUID()
    .withMessage('Valid product ID is required for each item'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1 for each item'),
  body('shipping_address_id')
    .isUUID()
    .withMessage('Valid shipping address ID is required'),
  body('billing_address_id')
    .isUUID()
    .withMessage('Valid billing address ID is required'),
  body('shipping_method')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Shipping method is required'),
  handleValidationErrors,
];

// Coupon validation
const validateCoupon = [
  body('code')
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Coupon code must contain only uppercase letters and numbers'),
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Coupon name must be between 3 and 100 characters'),
  body('discount_type')
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be either percentage or fixed'),
  body('discount_value')
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a positive number'),
  body('minimum_order_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum order amount must be a positive number'),
  body('usage_limit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Usage limit must be a positive integer'),
  handleValidationErrors,
];

// UUID parameter validation
const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('Valid UUID is required'),
  handleValidationErrors,
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validateProduct,
  validateProductQuery,
  validateReview,
  validateAddress,
  validateOrder,
  validateCoupon,
  validateUUID,
  validatePagination,
};
