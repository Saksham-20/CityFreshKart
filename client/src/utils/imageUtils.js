// Utility functions for handling image URLs in both development and production

const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return getPlaceholderImage();
  }
  
  // If it's already a full URL (http/https), return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // For local paths (start with /uploads), construct backend URL
  if (imagePath.startsWith('/uploads')) {
    const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    return `${apiBaseUrl}${imagePath}`;
  }
  
  // If it's just a filename, assume it's in /uploads/products/
  const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${apiBaseUrl}/uploads/products${normalizedPath}`;
};

const getPlaceholderImage = () => {
  try {
    // Try to serve local SVG placeholder
    const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    return `${apiBaseUrl}/uploads/products/default.svg`;
  } catch {
    // Fallback to data URI SVG
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-size='18' fill='%23999' text-anchor='middle' dominant-baseline='middle' font-family='Arial'%3ENo Image%3C/text%3E%3C/svg%3E`;
  }
};

export { getImageUrl, getPlaceholderImage };
