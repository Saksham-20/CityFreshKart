import React, { useState, useEffect } from 'react';
// import useAuth from '../../hooks/useAuth';
import { productService } from '../../services/productService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Loading from '../ui/Loading';
import { getImageUrl, getPlaceholderImage } from '../../utils/imageUtils';

const ProductManager = () => {
  // const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_per_kg: '', // Changed to price_per_kg for weight-based pricing
    discount: '', // Add discount percentage field
    category_id: '',
    sku: '',
    stock_quantity: '',
    weight: '',
    is_active: true,
    is_featured: false,
    is_bestseller: false,
    is_new_arrival: false
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [existingImages, setExistingImages] = useState([]); // existing images from server for edit

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Debug: Log categories when they change
  useEffect(() => {
    console.log('Categories state updated:', categories);
  }, [categories]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/products?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Admin products data:', data);
        console.log('First product:', data.products?.[0]);
        console.log('First product primary_image:', data.products?.[0]?.primary_image);
        if (process.env.NODE_ENV === 'development') {
          console.log('Constructed image URL:', data.products?.[0]?.primary_image ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${data.products?.[0]?.primary_image}` : 'No image');
        }
        // Ensure products is always an array
        if (data && Array.isArray(data.products)) {
          setProducts(data.products);
        } else if (data && data.data && Array.isArray(data.data.products)) {
          setProducts(data.data.products);
        } else {
          console.warn('Products response is not an array:', data);
          setProducts([]);
        }
      } else {
        console.error('Failed to fetch products:', response.status);
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      console.log('Fetching categories...');
      const response = await productService.getCategories();
      console.log('Categories response:', response); // Debug log
      // Ensure categories is always an array
      if (response && Array.isArray(response)) {
        setCategories(response);
      } else if (response && response.data && Array.isArray(response.data)) {
        setCategories(response.data);
      } else {
        console.warn('Categories response is not an array:', response);
        setCategories([]);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      // Fallback: try direct API call without auth since categories should be public
      try {
        console.log('Trying direct API call...');
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const directResponse = await fetch(`${apiUrl}/api/products/categories`);
        
        console.log('Direct response status:', directResponse.status);
        
        if (directResponse.ok) {
          const data = await directResponse.json();
          console.log('Direct categories response:', data); // Debug log
          // Ensure categories is always an array
          if (data && Array.isArray(data)) {
            setCategories(data);
          } else if (data && data.data && Array.isArray(data.data)) {
            setCategories(data.data);
          } else {
            console.warn('Direct categories response is not an array:', data);
            setCategories([]);
          }
        } else {
          console.error('Direct API call failed with status:', directResponse.status);
          const errorText = await directResponse.text();
          console.error('Error response:', errorText);
          setCategories([]);
        }
      } catch (directError) {
        console.error('Direct categories fetch also failed:', directError);
        setCategories([]);
      }
    } finally {
      setCategoriesLoading(false);
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
      category_id: '',
      sku: '',
      stock_quantity: '',
      weight: '',
      is_active: true,
      is_featured: false,
      is_bestseller: false,
      is_new_arrival: false
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
      const token = localStorage.getItem('token');
      
      // Create FormData for file upload
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      
      // Add images (limit to 6)
      selectedImages.slice(0, 6).forEach((image, index) => {
        formDataToSend.append(`images`, image);
      });

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        setShowAddModal(false);
        resetForm();
        fetchProducts();
        alert('Product created successfully!');
      } else {
        const errorData = await response.json();
        console.error('Failed to add product:', errorData.message);
        alert(`Failed to add product: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Failed to add product:', error);
      alert('Failed to add product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Build multipart form data so we can send new images too
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== undefined && formData[key] !== null) {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // Send information about which existing images to keep (the ones still in existingImages)
      const remainingImageIds = existingImages.map(img => img.id).join(',');
      formDataToSend.append('remaining_image_ids', remainingImageIds);
      
      // Append any newly selected images (existing ones are already on server)
      selectedImages.slice(0, 6).forEach((image) => {
        formDataToSend.append('images', image);
      });

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        setShowEditModal(false);
        resetForm();
        setSelectedProduct(null);
        setExistingImages([]);
        fetchProducts();
        alert('Product updated successfully!');
      } else {
        const errorData = await response.json();
        console.error('Failed to update product:', errorData.message);
        alert(`Failed to update product: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Failed to update product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/products/${selectedProduct.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setSelectedProduct(null);
        fetchProducts();
        // Show success message (you can add a toast notification here)
        alert('Product permanently removed successfully!');
      } else {
        const errorData = await response.json();
        console.error('Failed to delete product:', errorData.message);
        alert('Failed to delete product. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (productId, newQuantity) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/products/${productId}/stock`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: newQuantity })
      });

      if (response.ok) {
        // Update the product in the local state
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product.id === productId 
              ? { ...product, stock_quantity: newQuantity }
              : product
          )
        );
      } else {
        const errorData = await response.json();
        console.error('Failed to update stock:', errorData.message);
        alert('Failed to update stock. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('Failed to update stock. Please try again.');
    }
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price_per_kg: product.price_per_kg || product.price || '',
      discount: product.discount || '',
      category_id: product.category_id,
      sku: product.sku || '',
      stock_quantity: product.stock_quantity,
      weight: product.weight || '',
      is_active: product.is_active,
      is_featured: product.is_featured || false,
      is_bestseller: product.is_bestseller || false,
      is_new_arrival: product.is_new_arrival || false
    });
    // Fetch all existing images for this product to show in edit modal
    (async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiUrl}/api/products/${product.slug}`);
        if (res.ok) {
          const data = await res.json();
          const imgs = (data?.data?.product?.images || []).map(img => ({
            id: img.id,
            url: `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${img.image_url}`,
            is_primary: img.is_primary,
            sort_order: img.sort_order
          }));
          setExistingImages(imgs);
        } else {
          setExistingImages([]);
        }
      } catch (err) {
        console.error('Failed to fetch existing images', err);
        setExistingImages([]);
      } finally {
        setImagePreview([]); // reset previews for new uploads
        setSelectedImages([]);
        setShowEditModal(true);
      }
    })();
  };

  const removeExistingImage = (imageId) => {
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
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
                          handleStockUpdate(product.id, product.stock_quantity + 10);
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
                          handleStockUpdate(product.id, Math.max(0, product.stock_quantity - 10));
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
                    <div className="flex-shrink-0 h-10 w-10">
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={getImageUrl(product.primary_image)}
                        alt={product.name}
                        onError={(e) => {
                          console.log('Image failed to load:', e.target.src);
                          e.target.src = getPlaceholderImage();
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', product.primary_image);
                        }}
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        SKU: {product.sku || 'N/A'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.category_name || 'Uncategorized'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{product.price}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleStockUpdate(product.id, product.stock_quantity + 1)}
                      className="w-6 h-6 bg-green-100 hover:bg-green-200 text-green-600 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200"
                      title="Increase stock by 1"
                    >
                      +
                    </button>
                    <span className="font-medium min-w-[2rem] text-center">{product.stock_quantity}</span>
                    <button
                      onClick={() => handleStockUpdate(product.id, Math.max(0, product.stock_quantity - 1))}
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
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={categoriesLoading}
                >
                  <option value="">
                    {categoriesLoading ? 'Loading categories...' : 'Select Category'}
                  </option>
                  {Array.isArray(categories) && categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {!categoriesLoading && categories.length === 0 && (
                  <p className="mt-1 text-sm text-red-600">
                    No categories available. Please check if the server is running and the database is set up.
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="SKU"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  className="w-full"
                  placeholder="Product SKU"
                />
                <Input
                  label="Weight (kg)"
                  name="weight"
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={handleInputChange}
                  className="w-full"
                  placeholder="0.00"
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm font-medium text-gray-900">
                    Featured
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_bestseller"
                    checked={formData.is_bestseller}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm font-medium text-gray-900">
                    Bestseller
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_new_arrival"
                    checked={formData.is_new_arrival}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm font-medium text-gray-900">
                    New Arrival
                  </label>
                </div>
              </div>
              
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images
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
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={categoriesLoading}
                >
                  <option value="">
                    {categoriesLoading ? 'Loading categories...' : 'Select Category'}
                  </option>
                  {Array.isArray(categories) && categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {!categoriesLoading && categories.length === 0 && (
                  <p className="mt-1 text-sm text-red-600">
                    No categories available. Please check if the server is running and the database is set up.
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="SKU"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  className="w-full"
                  placeholder="Product SKU"
                />
                <Input
                  label="Weight (kg)"
                  name="weight"
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={handleInputChange}
                  className="w-full"
                  placeholder="0.00"
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm font-medium text-gray-900">
                    Featured
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_bestseller"
                    checked={formData.is_bestseller}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm font-medium text-gray-900">
                    Bestseller
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_new_arrival"
                    checked={formData.is_new_arrival}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm font-medium text-gray-900">
                    New Arrival
                  </label>
                </div>
              </div>
              
              {/* Image Management */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images
                </label>

                {/* Existing Images with remove buttons */}
                {existingImages && existingImages.length > 0 && (
                  <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {existingImages.map((img, idx) => (
                      <div key={img.id || idx} className="relative group">
                        <img
                          src={img.url}
                          alt="Existing"
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        {img.is_primary && (
                          <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-green-600 text-white">Primary</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeExistingImage(img.id)}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload new images */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload-edit"
                  />
                  <label
                    htmlFor="image-upload-edit"
                    className="cursor-pointer block"
                  >
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">
                      Click to upload new images or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 10MB each (Max 6 images total)
                    </p>
                    <p className="text-xs text-fresh-green font-medium">
                      {existingImages.length + selectedImages.length}/6 total images
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
        title="Permanently Delete Product"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.725-1.36 3.49 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Warning: This action cannot be undone
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>This will permanently delete:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Product: <strong>"{selectedProduct?.name}"</strong></li>
                    <li>All product images and files</li>
                    <li>All product data from the database</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-gray-700">
            Are you absolutely sure you want to permanently remove this product? This action cannot be undone and will remove all associated data and files.
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
              {loading ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductManager;
