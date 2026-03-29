const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadRoot = path.join(__dirname, '..', 'uploads');
/** Default 5MB; override with MAX_FILE_SIZE (bytes). Nginx must allow ≥ this or uploads return 413. */
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

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

// File filter function (Android often sends application/octet-stream or empty MIME for gallery/camera)
const fileFilter = (req, file, cb) => {
  const mime = String(file.mimetype || '').toLowerCase();
  if (mime.startsWith('image/')) {
    cb(null, true);
    return;
  }
  const allowByExt = !mime || mime === 'application/octet-stream';
  if (allowByExt && IMAGE_EXT.test(String(file.originalname || ''))) {
    cb(null, true);
    return;
  }
  console.warn(JSON.stringify({
    ts: new Date().toISOString(),
    event: 'upload_rejected_type',
    requestId: req.requestId,
    mimetype: file.mimetype,
    originalname: file.originalname,
    fieldname: file.fieldname,
  }));
  cb(new Error('Only image files are allowed!'), false);
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
  const ref = req.requestId;
  const route = `${req.method} ${req.baseUrl}${req.path}`;
  if (error instanceof multer.MulterError) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'upload_multer_error',
      requestId: ref,
      route,
      code: error.code,
      field: error.field,
      message: error.message,
    }));

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        ref,
        errorCode: 'FILE_TOO_LARGE',
        message: `File too large. Maximum size is ${formatFileSize(maxFileSizeBytes)}.`,
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        ref,
        errorCode: 'UNEXPECTED_FILE_FIELD',
        message: `Unexpected file field "${error.field || 'unknown'}". Use "images".`,
      });
    }

    return res.status(400).json({
      success: false,
      ref,
      errorCode: 'MULTER_ERROR',
      message: `Upload error: ${error.message}`,
    });
  } else if (error.message === 'Only image files are allowed!') {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'upload_validation_error',
      requestId: ref,
      route,
      message: error.message,
    }));

    return res.status(400).json({
      success: false,
      ref,
      errorCode: 'INVALID_FILE_TYPE',
      message:
        'Only image files are allowed (e.g. JPEG, PNG, WebP, GIF). On Android, pick a photo with a clear file name ending in .jpg or .png.',
    });
  }

  next(error);
};

module.exports = {
  upload,
  handleUploadError,
};
