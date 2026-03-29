const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class ImageService {
  constructor() {
    this.uploadDir = 'uploads';
    this.initializeUploadDirectories();
  }

  // Initialize upload directories
  async initializeUploadDirectories() {
    try {
      const dirs = [
        this.uploadDir,
        `${this.uploadDir}/products`,
        `${this.uploadDir}/users`,
        `${this.uploadDir}/temp`,
      ];

      for (const dir of dirs) {
        try {
          await fs.access(dir);
        } catch {
          await fs.mkdir(dir, { recursive: true });
        }
      }
    } catch (error) {
      console.error('Failed to initialize upload directories:', error);
    }
  }

  // Configure multer for file uploads
  getMulterConfig(type = 'product') {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = `${this.uploadDir}/${type}s`;
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    });

    const fileFilter = (req, file, cb) => {
      // Check file type
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    };

    const fileSize = parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024;
    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize,
        files: 10,
      },
    });
  }

  // Process and resize images
  async processImage(inputPath, outputPath, options = {}) {
    try {
      const {
        width = 800,
        height = 600,
        quality = 80,
        format = 'jpeg',
        fit = 'inside',
      } = options;

      await sharp(inputPath)
        .resize(width, height, { fit })
        .toFormat(format, { quality })
        .toFile(outputPath);

      return true;
    } catch (error) {
      console.error('Image processing failed:', error);
      throw new Error('Failed to process image');
    }
  }

  // Generate multiple image sizes for products
  async generateProductImages(inputPath, productId, imageIndex = 0) {
    try {
      const sizes = [
        { name: 'thumbnail', width: 150, height: 150, fit: 'cover' },
        { name: 'small', width: 300, height: 300, fit: 'inside' },
        { name: 'medium', width: 600, height: 600, fit: 'inside' },
        { name: 'large', width: 1200, height: 1200, fit: 'inside' },
      ];

      const processedImages = [];
      const baseDir = `${this.uploadDir}/products/${productId}`;
      const uniqueId = `${Date.now()}-${imageIndex}`;

      // Create product directory
      try {
        await fs.access(baseDir);
      } catch {
        await fs.mkdir(baseDir, { recursive: true });
      }

      for (const size of sizes) {
        const outputPath = `${baseDir}/${uniqueId}-${size.name}.jpg`;
        await this.processImage(inputPath, outputPath, {
          width: size.width,
          height: size.height,
          fit: size.fit,
          quality: 85,
        });
        processedImages.push({
          size: size.name,
          path: outputPath,
          url: `/uploads/products/${productId}/${uniqueId}-${size.name}.jpg`,
        });
      }

      return processedImages;
    } catch (error) {
      console.error('Failed to generate product images:', error);
      throw new Error('Failed to generate product images');
    }
  }

  // Generate user profile image
  async generateProfileImage(inputPath, userId) {
    try {
      const outputPath = `${this.uploadDir}/users/${userId}-profile.jpg`;

      await this.processImage(inputPath, outputPath, {
        width: 200,
        height: 200,
        fit: 'cover',
        quality: 90,
      });

      return {
        path: outputPath,
        url: `/uploads/users/${userId}-profile.jpg`,
      };
    } catch (error) {
      console.error('Failed to generate profile image:', error);
      throw new Error('Failed to generate profile image');
    }
  }

  // Delete image files
  async deleteImage(imagePath) {
    try {
      await fs.unlink(imagePath);
      return true;
    } catch (error) {
      console.error('Failed to delete image:', error);
      return false;
    }
  }

  // Delete all product images
  async deleteProductImages(productId) {
    try {
      const productDir = `${this.uploadDir}/products/${productId}`;
      await fs.rmdir(productDir, { recursive: true });
      return true;
    } catch (error) {
      console.error('Failed to delete product images:', error);
      return false;
    }
  }

  // Optimize image for web
  async optimizeForWeb(inputPath, outputPath) {
    try {
      await sharp(inputPath)
        .jpeg({ quality: 85, progressive: true })
        .png({ quality: 85, progressive: true })
        .toFile(outputPath);

      return true;
    } catch (error) {
      console.error('Image optimization failed:', error);
      throw new Error('Failed to optimize image');
    }
  }

  // Add watermark to image
  async addWatermark(inputPath, outputPath, watermarkPath, position = 'bottom-right') {
    try {
      const positions = {
        'top-left': { left: 10, top: 10 },
        'top-right': { right: 10, top: 10 },
        'bottom-left': { left: 10, bottom: 10 },
        'bottom-right': { right: 10, bottom: 10 },
        'center': { left: 0, top: 0 },
      };

      const pos = positions[position] || positions['bottom-right'];

      await sharp(inputPath)
        .composite([{
          input: watermarkPath,
          ...pos,
        }])
        .toFile(outputPath);

      return true;
    } catch (error) {
      console.error('Failed to add watermark:', error);
      throw new Error('Failed to add watermark');
    }
  }

  // Get image metadata
  async getImageMetadata(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
      };
    } catch (error) {
      console.error('Failed to get image metadata:', error);
      throw new Error('Failed to get image metadata');
    }
  }

  // Validate image dimensions
  async validateImageDimensions(imagePath, minWidth, minHeight) {
    try {
      const metadata = await sharp(imagePath).metadata();
      return metadata.width >= minWidth && metadata.height >= minHeight;
    } catch (error) {
      console.error('Failed to validate image dimensions:', error);
      return false;
    }
  }

  // Clean up temporary files
  async cleanupTempFiles() {
    try {
      const tempDir = `${this.uploadDir}/temp`;
      const files = await fs.readdir(tempDir);

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        const fileAge = Date.now() - stats.mtime.getTime();

        // Delete files older than 1 hour
        if (fileAge > 60 * 60 * 1000) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }
}

module.exports = new ImageService();
