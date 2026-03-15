const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => {
      // Determine folder based on route
      if (req.baseUrl.includes('products')) {
        return 'frashcart/products';
      } else if (req.baseUrl.includes('users')) {
        return 'frashcart/users';
      }
      return 'frashcart/general';
    },
    public_id: (req, file) => {
      // Generate unique filename
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      return `${file.fieldname}-${uniqueSuffix}`;
    },
    transformation: [
      { width: 800, height: 600, crop: 'limit', quality: 'auto' },
      { fetch_format: 'auto' },
    ],
  },
});

// Fallback to disk storage if Cloudinary is not configured
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';

    // Determine upload path based on file type or route
    if (req.baseUrl.includes('products')) {
      uploadPath += 'products/';
    } else if (req.baseUrl.includes('users')) {
      uploadPath += 'users/';
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// Use Cloudinary if configured, otherwise use disk storage
const finalStorage = process.env.CLOUDINARY_CLOUD_NAME ? storage : diskStorage;

// File filter function
const fileFilter = (req, file, cb) => {
  // Allow only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: finalStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // Use env variable or default 5MB
  },
  fileFilter: fileFilter,
});

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large. Maximum size is 5MB.',
      });
    }
  } else if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      message: error.message,
    });
  }

  next(error);
};

module.exports = {
  upload,
  handleUploadError,
};
