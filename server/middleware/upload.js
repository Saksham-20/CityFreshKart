const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadRoot = path.join(__dirname, '..', 'uploads');
const maxFileSizeBytes = parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024;

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '5MB';
  const mb = bytes / (1024 * 1024);
  return Number.isInteger(mb) ? `${mb}MB` : `${mb.toFixed(1)}MB`;
};

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadRoot;

    // Determine upload path based on the route path (req.path) or baseUrl
    const fullPath = (req.baseUrl + req.path).toLowerCase();
    if (fullPath.includes('products')) {
      uploadPath = path.join(uploadPath, 'products');
    } else if (fullPath.includes('users')) {
      uploadPath = path.join(uploadPath, 'users');
    } else {
      uploadPath = path.join(uploadPath, 'general');
    }

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
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
  storage: diskStorage,
  limits: {
    fileSize: maxFileSizeBytes,
  },
  fileFilter: fileFilter,
});

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Upload middleware error:', {
      code: error.code,
      field: error.field,
      route: `${req.method} ${req.baseUrl}${req.path}`,
    });

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: `File too large. Maximum size is ${formatFileSize(maxFileSizeBytes)}.`,
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: `Unexpected file field "${error.field || 'unknown'}". Use "images".`,
      });
    }

    return res.status(400).json({
      message: `Upload error: ${error.message}`,
    });
  } else if (error.message === 'Only image files are allowed!') {
    console.error('Upload validation error:', {
      message: error.message,
      route: `${req.method} ${req.baseUrl}${req.path}`,
    });

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
