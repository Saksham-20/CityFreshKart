import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Loading from '../ui/Loading';
import { getImageUrl, getPlaceholderImage } from '../../utils/imageUtils';
import toast from 'react-hot-toast';

const emptyForm = () => ({
  name: '',
  price_per_kg: '',
  discount: '',
  category: '',
  stock_quantity: '',
  image_url: '',
  is_active: true,
  pricing_type: 'per_kg',
});

const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await api.get('/products/categories');
      const next = res.data?.data || [];
      setCategories(next);
    } catch (e) {
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

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
      toast.error('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setSelectedImages([]);
    setImagePreview([]);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const currentCount = existingImages.length + selectedImages.length;
    const remainingSlots = 6 - currentCount;
    if (files.length > remainingSlots) {
      toast.error(`You can only upload ${remainingSlots} more image(s).`);
      return;
    }
    if (currentCount >= 6) {
      toast.error('Maximum 6 images per product.');
      return;
    }
    const uniqueFiles = files.filter(newFile =>
      !selectedImages.some(f => f.name === newFile.name && f.size === newFile.size)
    );
    setSelectedImages([...selectedImages, ...uniqueFiles]);
    setImagePreview([...imagePreview, ...uniqueFiles.map(f => URL.createObjectURL(f))]);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const fd = new FormData();
      Object.keys(formData).forEach(key => fd.append(key, formData[key]));
      selectedImages.slice(0, 6).forEach(img => fd.append('images', img));
      await api.post('/admin/products', fd);
      setShowAddModal(false);
      resetForm();
      fetchProducts();
      toast.success('Product created successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const fd = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== undefined && formData[key] !== null) fd.append(key, formData[key]);
      });
      if (existingImages.length === 0 && selectedImages.length === 0) fd.set('image_url', '');
      if (selectedImages.length > 0) fd.append('images', selectedImages[0]);
      await api.put(`/admin/products/${selectedProduct.id}`, fd);
      setShowEditModal(false);
      resetForm();
      setSelectedProduct(null);
      setExistingImages([]);
      fetchProducts();
      toast.success('Product updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update product');
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
      toast.success('Product hidden from store.');
    } catch {
      toast.error('Failed to remove product.');
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (productId, newQuantity) => {
    try {
      await api.put(`/admin/products/${productId}/stock`, { quantity: newQuantity });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, quantity_available: newQuantity } : p));
    } catch {
      toast.error('Failed to update stock.');
    }
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      price_per_kg: product.price_per_kg || '',
      discount: product.discount || '',
      category: product.category || '',
      stock_quantity: product.quantity_available || '',
      image_url: product.image_url || '',
      is_active: product.is_active,
      pricing_type: product.pricing_type || 'per_kg',
    });
    setExistingImages(product.image_url ? [{ id: product.id, url: product.image_url }] : []);
    setImagePreview([]);
    setSelectedImages([]);
    setShowEditModal(true);
  };

  const priceLabel = (pType) => pType === 'per_piece' ? 'Price per piece (₹)' : 'Price per kg (₹)';
  const stockLabel = (pType) => pType === 'per_piece' ? 'Stock (pieces)' : 'Stock (kg)';
  const priceDisplay = (p) => `₹${p.price_per_kg}/${p.pricing_type === 'per_piece' ? 'pc' : 'kg'}`;

  if (loading && products.length === 0) return <Loading />;

  const PricingTypeToggle = ({ value, onChange }) => (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Pricing Type:</span>
      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
        {[{ v: 'per_kg', label: 'Per Kg' }, { v: 'per_piece', label: 'Per Piece' }].map(({ v, label }) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              value === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  const ImageSection = ({ isEdit = false }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
      {isEdit && existingImages.length > 0 && (
        <div className="mb-3 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <img src={getImageUrl(existingImages[0].url)} alt="Current"
            className="h-16 w-16 object-cover rounded-lg border border-gray-200"
            onError={(e) => { e.target.src = getPlaceholderImage(); }} />
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Current image</p>
            <button type="button" onClick={() => { setExistingImages([]); setFormData(p => ({ ...p, image_url: '' })); }}
              className="text-xs text-red-600 hover:text-red-700 font-medium">Remove image</button>
          </div>
        </div>
      )}
      {(!isEdit || existingImages.length === 0) && (
        <>
          <Input label="Image URL (Pexels or any direct link)" name="image_url" type="url"
            value={formData.image_url} onChange={handleInputChange} className="w-full mb-2"
            placeholder="https://images.pexels.com/photos/..." />
          {formData.image_url && (
            <img src={formData.image_url} alt="Preview"
              className="mb-2 h-20 w-20 object-cover rounded-lg border border-gray-200"
              onError={(e) => { e.target.style.display = 'none'; }} />
          )}
          <p className="text-xs text-gray-400 mb-2 text-center">— or upload a file —</p>
          {selectedImages.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center hover:border-gray-400 transition-colors">
              <input type="file" accept="image/*" multiple={!isEdit}
                id={isEdit ? 'img-edit' : 'img-add'}
                onChange={isEdit ? (e) => {
                  const f = e.target.files[0];
                  if (!f) return;
                  setSelectedImages([f]);
                  setImagePreview([URL.createObjectURL(f)]);
                } : handleImageChange}
                className="hidden" />
              <label htmlFor={isEdit ? 'img-edit' : 'img-add'} className="cursor-pointer block text-sm text-gray-600">
                Click to upload · PNG, JPG up to 5MB
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <img src={imagePreview[0]} alt="New" className="h-14 w-14 object-cover rounded-lg border border-gray-200" />
              <div className="flex-1">
                <p className="text-xs text-gray-700 truncate">{selectedImages[0]?.name}</p>
                <button type="button" onClick={() => { setSelectedImages([]); setImagePreview([]); }}
                  className="text-xs text-red-600 font-medium">Remove</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const ProductForm = ({ onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl mx-auto">
      <PricingTypeToggle value={formData.pricing_type}
        onChange={(v) => setFormData(p => ({ ...p, pricing_type: v }))} />

      <Input label="Product Name *" name="name" value={formData.name}
        onChange={handleInputChange} required className="w-full" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label={`${priceLabel(formData.pricing_type)} *`} name="price_per_kg" type="number"
          step="0.01" min="0" value={formData.price_per_kg} onChange={handleInputChange}
          required className="w-full" placeholder="0.00" />
        <Input label="Discount (%)" name="discount" type="number" step="0.01" min="0" max="100"
          value={formData.discount} onChange={handleInputChange} className="w-full" placeholder="0" />
        <Input label={`${stockLabel(formData.pricing_type)} *`} name="stock_quantity" type="number"
          value={formData.stock_quantity} onChange={handleInputChange} required className="w-full" placeholder="0" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
        <select name="category" value={formData.category} onChange={handleInputChange} required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Select Category</option>
          {categoriesLoading ? (
            <option value="" disabled>Loading...</option>
          ) : (
            categories.map(cat => <option key={cat} value={cat}>{cat}</option>)
          )}
        </select>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
        <span className="text-sm font-medium text-gray-900">Active (visible in store)</span>
      </label>

      <ImageSection isEdit={submitLabel.includes('Update')} />

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline"
          onClick={() => submitLabel.includes('Update') ? setShowEditModal(false) : setShowAddModal(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : submitLabel}</Button>
      </div>
    </form>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
        <Button onClick={() => { resetForm(); setShowAddModal(true); }}>Add New Product</Button>
      </div>

      {/* Products Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stock
                  <div className="mt-1 flex space-x-1">
                    <button onClick={() => {
                      if (window.confirm('Add 10 to all products stock?')) {
                        products.forEach(p => handleStockUpdate(p.id, (parseFloat(p.quantity_available) || 0) + 10));
                      }
                    }} className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 px-2 py-0.5 rounded">+10 All</button>
                    <button onClick={() => {
                      if (window.confirm('Subtract 10 from all products stock?')) {
                        products.forEach(p => handleStockUpdate(p.id, Math.max(0, (parseFloat(p.quantity_available) || 0) - 10)));
                      }
                    }} className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-600 px-2 py-0.5 rounded">-10 All</button>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No products found</td></tr>
              ) : products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img className="h-12 w-12 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                        src={getImageUrl(product.image_url)} alt={product.name}
                        onError={(e) => { e.target.src = getPlaceholderImage(); }} />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        {product.discount > 0 && (
                          <p className="text-xs text-green-600 font-medium">{product.discount}% off</p>
                        )}
                        <p className="text-[10px] text-gray-400">{product.pricing_type === 'per_piece' ? 'Per piece' : 'Per kg'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{product.category || 'Uncategorized'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{priceDisplay(product)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-1">
                      <button onClick={() => handleStockUpdate(product.id, (parseFloat(product.quantity_available) || 0) + 1)}
                        className="w-6 h-6 bg-green-100 hover:bg-green-200 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">+</button>
                      <span className="font-medium min-w-[2.5rem] text-center">
                        {product.quantity_available}{product.pricing_type === 'per_piece' ? ' pc' : ' kg'}
                      </span>
                      <button onClick={() => handleStockUpdate(product.id, Math.max(0, (parseFloat(product.quantity_available) || 0) - 1))}
                        className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">−</button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(product)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => { setSelectedProduct(product); setShowDeleteModal(true); }}
                      className="bg-red-600 hover:bg-red-700">Remove</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Product">
        <ProductForm onSubmit={handleAddProduct} submitLabel="Add Product" />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Product">
        <ProductForm onSubmit={handleEditProduct} submitLabel="Update Product" />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Deactivate Product">
        <div className="space-y-4">
          <p className="text-gray-700">
            This will hide <strong>"{selectedProduct?.name}"</strong> from the store. It can be re-activated later by editing the product.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={loading}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteProduct} disabled={loading}
              className="bg-red-600 hover:bg-red-700">
              {loading ? 'Deactivating...' : 'Deactivate Product'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductManager;
