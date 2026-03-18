import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Loading from '../ui/Loading';
import { getImageUrl, getPlaceholderImage } from '../../utils/imageUtils';

const CATEGORIES = ['Vegetables', 'Fruits', 'Dairy', 'Bakery', 'Grains', 'Herbs & Spices', 'Other'];

const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_per_kg: '',
    discount: '',
    category: '',
    stock_quantity: '',
    image_url: '',
    is_active: true,
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/products', { params: { limit: 100 } });
      const data = response.data;
      if (data && Array.isArray(data.products)) {
        setProducts(data.products);
      } else if (data && data.data && Array.isArray(data.data.products)) {
        setProducts(data.data.products);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_per_kg: '',
      discount: '',
      category: '',
      stock_quantity: '',
      image_url: '',
      is_active: true,
    });
    setSelectedImages([]);
    setImagePreview([]);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 6 images maximum (including existing ones in edit mode)
    const currentCount = existingImages.length + selectedImages.length;
    const remainingSlots = 6 - currentCount;
    
    if (files.length > remainingSlots) {
      alert(`You can only upload ${remainingSlots} more images. You currently have ${currentCount}/6 images.`);
      return;
    }
    
    if (currentCount >= 6) {
      alert('You have reached the maximum of 6 images per product. Please remove some images before adding new ones.');
      return;
    }
    
    // Filter out duplicate files by name and size
    const uniqueFiles = files.filter(newFile => 
      !selectedImages.some(existingFile => 
        existingFile.name === newFile.name && existingFile.size === newFile.size
      )
    );
    
    if (uniqueFiles.length !== files.length) {
      alert('Some duplicate images were removed. Please select unique images.');
    }
    
    setSelectedImages([...selectedImages, ...uniqueFiles]);
    
    // Create preview URLs
    const newPreviews = uniqueFiles.map(file => URL.createObjectURL(file));
    setImagePreview([...imagePreview, ...newPreviews]);
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreview.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setImagePreview(newPreviews);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      selectedImages.slice(0, 6).forEach((image) => {
        formDataToSend.append('images', image);
      });

      await api.post('/admin/products', formDataToSend);
      setShowAddModal(false);
      resetForm();
      fetchProducts();
      alert('Product created successfully!');
    } catch (error) {
      console.error('Failed to add product:', error);
      alert(`Failed to add product: ${error.response?.data?.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== undefined && formData[key] !== null) {
          formDataToSend.append(key, formData[key]);
        }
      });

      // If existing image was removed and no new file uploaded, explicitly clear image_url
      if (existingImages.length === 0 && selectedImages.length === 0) {
        formDataToSend.set('image_url', '');
      }

      // Only upload first image (server PUT route accepts 1)
      if (selectedImages.length > 0) {
        formDataToSend.append('images', selectedImages[0]);
      }

      await api.put(`/admin/products/${selectedProduct.id}`, formDataToSend);
      setShowEditModal(false);
      resetForm();
      setSelectedProduct(null);
      setExistingImages([]);
      fetchProducts();
      alert('Product updated successfully!');
    } catch (error) {
      console.error('Failed to update product:', error);
      alert(`Failed to update product: ${error.response?.data?.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    try {
      setLoading(true);
      await api.delete(`/admin/products/${selectedProduct.id}`);
      setShowDeleteModal(false);
      setSelectedProduct(null);
      fetchProducts();
      alert('Product deactivated and hidden from store successfully!');
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (productId, newQuantity) => {
    try {
      await api.put(`/admin/products/${productId}/stock`, { quantity: newQuantity });
      setProducts(prevProducts =>
        prevProducts.map(product =>
          product.id === productId
            ? { ...product, quantity_available: newQuantity }
            : product
        )
      );
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('Failed to update stock. Please try again.');
    }
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price_per_kg: product.price_per_kg || '',
      discount: product.discount || '',
      category: product.category || '',
      stock_quantity: product.quantity_available || '',
      image_url: product.image_url || '',
      is_active: product.is_active,
    });
    if (product.image_url) {
      setExistingImages([{ id: product.id, url: product.image_url, is_primary: true }]);
    } else {
      setExistingImages([]);
    }
    setImagePreview([]);
    setSelectedImages([]);
    setShowEditModal(true);
  };

  const removeExistingImage = (imageId) => {
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
    // Also clear the image_url in formData so the server knows it's been removed
    setFormData(prev => ({ ...prev, image_url: '' }));
  };


  const openDeleteModal = (product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  if (loading && products.length === 0) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
        <Button onClick={() => setShowAddModal(true)}>
          Add New Product
        </Button>
      </div>

      {/* Products Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
                <div className="mt-1 flex space-x-1">
                  <button
                    onClick={() => {
                      if (window.confirm('Add 10 to all products stock?')) {
                        products.forEach(product => {
                          handleStockUpdate(product.id, (parseFloat(product.quantity_available) || 0) + 10);
                        });
                      }
                    }}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 px-2 py-1 rounded"
                    title="Add 10 to all"
                  >
                    +10 All
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Subtract 10 from all products stock?')) {
                        products.forEach(product => {
                          handleStockUpdate(product.id, Math.max(0, (parseFloat(product.quantity_available) || 0) - 10));
                        });
                      }
                    }}
                    className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-600 px-2 py-1 rounded"
                    title="Subtract 10 from all"
                  >
                    -10 All
                  </button>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.isArray(products) && products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12">
                      <img
                        className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                        src={getImageUrl(product.image_url)}
                        alt={product.name}
                        onError={(e) => {
                          e.target.src = getPlaceholderImage();
                        }}
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {product.name}
                      </div>
                      {product.discount > 0 && (
                        <div className="text-xs text-green-600 font-medium">
                          {product.discount}% off
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.category || 'Uncategorized'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{product.price_per_kg}/kg
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleStockUpdate(product.id, (parseFloat(product.quantity_available) || 0) + 1)}
                      className="w-6 h-6 bg-green-100 hover:bg-green-200 text-green-600 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200"
                      title="Increase stock by 1"
                    >
                      +
                    </button>
                    <span className="font-medium min-w-[2rem] text-center">{product.quantity_available}</span>
                    <button
                      onClick={() => handleStockUpdate(product.id, Math.max(0, (parseFloat(product.quantity_available) || 0) - 1))}
                      className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200"
                      title="Decrease stock by 1"
                    >
                      -
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    product.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(product)}
                    className="mr-2"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => openDeleteModal(product)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Product"
      >
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleAddProduct} className="space-y-6">
            <div className="space-y-4">
              <Input
                label="Product Name *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter product description..."
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Price per kg (₹) *"
                  name="price_per_kg"
                  type="number"
                  step="0.01"
                  value={formData.price_per_kg}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                  placeholder="0.00"
                />
                <Input
                  label="Discount (%) *"
                  name="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discount}
                  onChange={handleInputChange}
                  className="w-full"
                  placeholder="0"
                />
                <Input
                  label="Stock Quantity *"
                  name="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm font-medium text-gray-900">
                  Active
                </label>
              </div>
              
              {/* Image URL (direct link) */}
              <div>
                <Input
                  label="Image URL (paste a direct link, e.g. from Pexels)"
                  name="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={handleInputChange}
                  className="w-full"
                  placeholder="https://images.pexels.com/photos/..."
                />
                {formData.image_url && (
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="mt-2 h-24 w-24 object-cover rounded-lg border border-gray-200"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or Upload Image File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer block"
                  >
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">
                      Click to upload images or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 10MB each (Max 6 images)
                    </p>
                    <p className="text-xs text-fresh-green font-medium">
                      {selectedImages.length}/6 images selected
                    </p>
                  </label>
                </div>
                
                {imagePreview.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {imagePreview.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="px-6 py-2">
                {loading ? 'Adding...' : 'Add Product'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Product"
      >
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleEditProduct} className="space-y-6">
            <div className="space-y-4">
              <Input
                label="Product Name *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter product description..."
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Price per kg (₹) *"
                  name="price_per_kg"
                  type="number"
                  step="0.01"
                  value={formData.price_per_kg}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                  placeholder="0.00"
                />
                <Input
                  label="Discount (%) *"
                  name="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discount}
                  onChange={handleInputChange}
                  className="w-full"
                  placeholder="0"
                />
                <Input
                  label="Stock Quantity *"
                  name="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm font-medium text-gray-900">
                  Active
                </label>
              </div>
              
              {/* Product Image Management */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image
                </label>

                {/* Current image (from existingImages) */}
                {existingImages.length > 0 && (
                  <div className="mb-3 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <img
                      src={getImageUrl(existingImages[0].url)}
                      alt="Current"
                      className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                      onError={(e) => { e.target.src = getPlaceholderImage(); }}
                    />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Current image</p>
                      <button
                        type="button"
                        onClick={() => removeExistingImage(existingImages[0].id)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                )}

                {/* No current image — show URL input or file upload */}
                {existingImages.length === 0 && (
                  <>
                    <Input
                      label="Image URL (paste a direct link, e.g. from Pexels)"
                      name="image_url"
                      type="url"
                      value={formData.image_url}
                      onChange={handleInputChange}
                      className="w-full mb-2"
                      placeholder="https://images.pexels.com/photos/..."
                    />
                    {formData.image_url && (
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="mb-2 h-20 w-20 object-cover rounded-lg border border-gray-200"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <p className="text-xs text-gray-400 mb-2 text-center">— or upload a file —</p>

                    {/* New file upload (1 image only for edit) */}
                    {selectedImages.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            setSelectedImages([file]);
                            setImagePreview([URL.createObjectURL(file)]);
                          }}
                          className="hidden"
                          id="image-upload-edit"
                        />
                        <label htmlFor="image-upload-edit" className="cursor-pointer block">
                          <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <p className="mt-1 text-sm text-gray-600">Click to upload image</p>
                          <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                        </label>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <img
                          src={imagePreview[0]}
                          alt="New"
                          className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                        />
                        <div className="flex-1">
                          <p className="text-xs text-gray-700 truncate">{selectedImages[0]?.name}</p>
                          <button
                            type="button"
                            onClick={() => { setSelectedImages([]); setImagePreview([]); }}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="px-6 py-2">
                {loading ? 'Updating...' : 'Update Product'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Deactivate Product"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.725-1.36 3.49 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Product will be hidden from the store
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>This will deactivate:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Product: <strong>"{selectedProduct?.name}"</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <p className="text-gray-700">
            The product will be hidden from the store and customers will no longer see it. It can be re-activated later by editing the product.
          </p>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteProduct}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Deactivating...' : 'Deactivate Product'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductManager;
