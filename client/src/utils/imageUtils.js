import { getPublicApiOrigin } from './publicOrigin';

// Utility functions for handling image URLs in both development and production

const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return getPlaceholderImage();
  }

  imagePath = String(imagePath).replace(/\\/g, '/');

  // If it's already a full URL (http/https), return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }

  const apiBaseUrl = getPublicApiOrigin();

  // For paths starting with /uploads or uploads/ (disk storage paths from multer)
  if (imagePath.startsWith('/uploads') || imagePath.startsWith('uploads/')) {
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${apiBaseUrl}${cleanPath}`;
  }

  // Handle absolute disk paths like /some/path/uploads/products/xyz.jpg
  if (imagePath.includes('/uploads/')) {
    const uploadsIndex = imagePath.indexOf('/uploads/');
    const relPath = imagePath.slice(uploadsIndex); // keep the leading /uploads/...
    return `${apiBaseUrl}${relPath}`;
  }

  // Bare filename — assume it lives under /uploads/products/
  return `${apiBaseUrl}/uploads/products/${imagePath}`;
};

const getPlaceholderImage = () => {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='45%25' font-size='40' text-anchor='middle' dominant-baseline='middle'%3E%F0%9F%A5%A6%3C/text%3E%3Ctext x='50%25' y='70%25' font-size='16' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle' font-family='Arial'%3ENo Image%3C/text%3E%3C/svg%3E`;
};

export { getImageUrl, getPlaceholderImage };
