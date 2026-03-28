import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Loading from '../ui/Loading';
import { getImageUrl, getPlaceholderImage, IMAGE_DIMS } from '../../utils/imageUtils';
import toast from 'react-hot-toast';
import { formatApiErrorMessage } from '../../utils/apiErrorMessage';

const emptyForm = () => ({
  name: '',
  discount: '',
  category: '',
  stock_quantity: '',
  image_url: '',
  is_active: true,
  pricing_type: 'per_kg',
  weight_display_unit: 'kg',
  weight_price_rows: [{ weight: '', price: '', unit: 'kg' }],
});

/** Convert stored kg tier to admin row display (g for pack sizes under 1 kg when whole grams). */
const kgTierToDisplay = (kgWeight) => {
  const w = Number(kgWeight);
  if (!Number.isFinite(w) || w <= 0) return { weight: '', unit: 'kg' };
  const grams = w * 1000;
  const roundedG = Math.round(grams);
  if (w < 1 && Math.abs(grams - roundedG) < 1e-5) {
    return { weight: String(roundedG), unit: 'g' };
  }
  const kgStr = Number(w.toFixed(4)).toString();
  return { weight: kgStr, unit: 'kg' };
};

const rowsToWeightOverrides = (rows = [], pricingType = 'per_kg') => {
  const out = {};
  const dup = new Set();
  rows.forEach((row) => {
    const rawWeight = parseFloat(row.weight);
    const price = parseFloat(row.price);
    if (!Number.isFinite(rawWeight) || rawWeight <= 0) return;
    if (!Number.isFinite(price) || price < 0) return;

    let weightKg;
    if (pricingType === 'per_piece') {
      weightKg = rawWeight;
    } else {
      const u = row.unit === 'g' ? 'g' : 'kg';
      weightKg = u === 'g' ? rawWeight / 1000 : rawWeight;
    }
    const key = weightKg.toFixed(2);
    if (Object.prototype.hasOwnProperty.call(out, key)) dup.add(key);
    out[key] = price;
  });
  if (dup.size > 0) {
    toast.error('Duplicate weight tiers were merged — keep each weight unique.');
  }
  return out;
};

const weightOverridesToRows = (overrides = {}, pricingType = 'per_kg') => {
  const entries = Object.entries(overrides || {})
    .map(([k, price]) => ({ kg: parseFloat(k), price }))
    .filter((e) => Number.isFinite(e.kg) && e.kg > 0 && Number.isFinite(parseFloat(e.price)))
    .sort((a, b) => a.kg - b.kg);

  if (entries.length === 0) {
    return pricingType === 'per_piece'
      ? [{ weight: '', price: '' }]
      : [{ weight: '', price: '', unit: 'kg' }];
  }

  return entries.map(({ kg, price }) => {
    if (pricingType === 'per_piece') {
      return { weight: String(Number(kg.toFixed(2))), price: String(price) };
    }
    const { weight, unit } = kgTierToDisplay(kg);
    return { weight, price: String(price), unit };
  });
};

const deriveWeightDisplayUnit = (rows = [], pricingType = 'per_kg') => {
  if (pricingType === 'per_piece') return 'kg';
  const tiers = (rows || []).filter((r) => {
    const w = parseFloat(r.weight);
    const p = parseFloat(r.price);
    return Number.isFinite(w) && w > 0 && Number.isFinite(p) && p >= 0;
  });
  if (tiers.length === 0) return 'kg';
  const allG = tiers.every((r) => r.unit === 'g');
  return allG ? 'g' : 'kg';
};

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

const ImageSection = ({
  formData,
  handleInputChange,
  selectedImages,
  setSelectedImages,
  imagePreview,
  setImagePreview,
  existingImages,
  setExistingImages,
  handleImageChange,
  isEdit = false,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
    {isEdit && existingImages.length > 0 && (
      <div className="mb-3 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <img
          src={getImageUrl(existingImages[0].url)}
          alt="Current"
          width={IMAGE_DIMS.formPreviewLg.width}
          height={IMAGE_DIMS.formPreviewLg.height}
          className="h-16 w-16 object-cover rounded-lg border border-gray-200"
          loading="lazy"
          decoding="async"
          onError={(e) => { e.target.src = getPlaceholderImage(); }}
        />
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">Current image</p>
          <button type="button" onClick={() => { setExistingImages([]); }}
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
          <img
            src={formData.image_url}
            alt="Preview"
            width={IMAGE_DIMS.formPreview.width}
            height={IMAGE_DIMS.formPreview.height}
            className="mb-2 h-20 w-20 object-cover rounded-lg border border-gray-200"
            loading="lazy"
            decoding="async"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        <p className="text-xs text-gray-400 mb-2 text-center">- or upload a file -</p>
        {selectedImages.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center hover:border-gray-400 transition-colors">
            <input type="file" accept="image/*" multiple={!isEdit}
              id={isEdit ? 'img-edit' : 'img-add'}
              onChange={isEdit ? (e) => {
                const f = e.target.files[0];
                if (!f) return;
                setSelectedImages([f]);
                setImagePreview([URL.createObjectURL(f)]);
                e.target.value = '';
              } : handleImageChange}
              className="hidden" />
            <label htmlFor={isEdit ? 'img-edit' : 'img-add'} className="cursor-pointer block text-sm text-gray-600">
              Click to upload · PNG, JPG up to 5MB
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <img
              src={imagePreview[0]}
              alt="New"
              width={IMAGE_DIMS.formThumb.width}
              height={IMAGE_DIMS.formThumb.height}
              className="h-14 w-14 object-cover rounded-lg border border-gray-200"
              loading="lazy"
              decoding="async"
            />
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

const ProductForm = ({
  formData,
  handleInputChange,
  categories,
  categoriesLoading,
  loading,
  onSubmit,
  onCancel,
  submitLabel,
  selectedImages,
  setSelectedImages,
  imagePreview,
  setImagePreview,
  existingImages,
  setExistingImages,
  handleImageChange,
}) => {
  const stockLabel = formData.pricing_type === 'per_piece' ? 'Stock (pieces)' : 'Stock (kg)';

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl mx-auto">
      <PricingTypeToggle value={formData.pricing_type}
        onChange={(v) => handleInputChange({ target: { name: 'pricing_type', value: v, type: 'text' } })} />

      <Input label="Product Name" name="name" value={formData.name}
        onChange={handleInputChange} required className="w-full" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Discount (%)" name="discount" type="number" step="0.01" min="0" max="100"
          value={formData.discount} onChange={handleInputChange} className="w-full" placeholder="0" />
        <Input label={stockLabel} name="stock_quantity" type="number"
          step={formData.pricing_type === 'per_piece' ? '1' : '0.01'}
          min="0"
          value={formData.stock_quantity} onChange={handleInputChange} required className="w-full"
          placeholder={formData.pricing_type === 'per_piece' ? 'e.g. 100' : 'e.g. 10.5'} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Custom weight tiers and prices (Rs)</label>
        <div className="space-y-2">
          {(formData.weight_price_rows || []).map((row, idx) => {
            const rowUnit = row.unit === 'g' ? 'g' : 'kg';
            const isPiece = formData.pricing_type === 'per_piece';
            return (
              <div key={`weight-row-${idx}`} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className={isPiece ? 'sm:col-span-5' : 'sm:col-span-4'}>
                  <label className="block text-xs text-gray-500 mb-1">
                    {isPiece ? 'Pieces' : `Weight (${rowUnit})`}
                  </label>
                  <input
                    type="number"
                    min={isPiece ? '1' : (rowUnit === 'g' ? '1' : '0.01')}
                    step={isPiece ? '1' : (rowUnit === 'g' ? '1' : '0.01')}
                    value={row.weight}
                    onChange={(e) => {
                      const next = [...(formData.weight_price_rows || [])];
                      next[idx] = { ...next[idx], weight: e.target.value };
                      handleInputChange({ target: { name: 'weight_price_rows', value: next, type: 'text' } });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder={isPiece ? 'e.g. 2' : (rowUnit === 'g' ? 'e.g. 750' : 'e.g. 0.75')}
                  />
                </div>
                <div className={isPiece ? 'sm:col-span-5' : 'sm:col-span-4'}>
                  <label className="block text-xs text-gray-500 mb-1">Price (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.price}
                    onChange={(e) => {
                      const next = [...(formData.weight_price_rows || [])];
                      next[idx] = { ...next[idx], price: e.target.value };
                      handleInputChange({ target: { name: 'weight_price_rows', value: next, type: 'text' } });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g. 59"
                  />
                </div>
                {!isPiece && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Unit</label>
                    <select
                      value={rowUnit}
                      onChange={(e) => {
                        const next = [...(formData.weight_price_rows || [])];
                        const u = e.target.value === 'g' ? 'g' : 'kg';
                        next[idx] = { ...next[idx], unit: u };
                        handleInputChange({ target: { name: 'weight_price_rows', value: next, type: 'text' } });
                      }}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                    </select>
                  </div>
                )}
                <div className="sm:col-span-2 flex items-end pb-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const rows = formData.weight_price_rows || [];
                      const emptyRow = isPiece
                        ? { weight: '', price: '' }
                        : { weight: '', price: '', unit: 'kg' };
                      const next = rows.length <= 1 ? [emptyRow] : rows.filter((_, i) => i !== idx);
                      handleInputChange({ target: { name: 'weight_price_rows', value: next, type: 'text' } });
                    }}
                    className="w-full"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const isPiece = formData.pricing_type === 'per_piece';
              const next = [...(formData.weight_price_rows || []), isPiece
                ? { weight: '', price: '' }
                : { weight: '', price: '', unit: 'kg' }];
              handleInputChange({ target: { name: 'weight_price_rows', value: next, type: 'text' } });
            }}
          >
            Add Weight Tier
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
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

      <ImageSection
        formData={formData}
        handleInputChange={handleInputChange}
        selectedImages={selectedImages}
        setSelectedImages={setSelectedImages}
        imagePreview={imagePreview}
        setImagePreview={setImagePreview}
        existingImages={existingImages}
        setExistingImages={setExistingImages}
        handleImageChange={handleImageChange}
        isEdit={submitLabel.includes('Update')}
      />

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : submitLabel}</Button>
      </div>
    </form>
  );
};

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
      console.error('fetchCategories', e.response?.data || e.message);
      toast.error(formatApiErrorMessage(e, 'Failed to load categories'));
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
      console.error('Failed to fetch products:', error.response?.data || error.message);
      toast.error(formatApiErrorMessage(error, 'Failed to load products'));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setFormData((prev) => {
      if (name === 'pricing_type') {
        const nextType = nextValue === 'per_piece' ? 'per_piece' : 'per_kg';
        const nextRows = nextType === 'per_piece'
          ? [{ weight: '', price: '' }]
          : [{ weight: '', price: '', unit: 'kg' }];
        return {
          ...prev,
          pricing_type: nextType,
          weight_display_unit: 'kg',
          weight_price_rows: nextRows,
        };
      }
      return { ...prev, [name]: nextValue };
    });
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
      e.target.value = '';
      return;
    }
    if (currentCount >= 6) {
      toast.error('Maximum 6 images per product.');
      e.target.value = '';
      return;
    }
    const uniqueFiles = files.filter(newFile =>
      !selectedImages.some(f => f.name === newFile.name && f.size === newFile.size)
    );
    setSelectedImages([...selectedImages, ...uniqueFiles]);
    setImagePreview([...imagePreview, ...uniqueFiles.map(f => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const overrides = rowsToWeightOverrides(formData.weight_price_rows, formData.pricing_type);
      if (Object.keys(overrides).length === 0) {
        toast.error('Add at least one valid custom weight tier with price.');
        return;
      }
      const derivedUnit = deriveWeightDisplayUnit(formData.weight_price_rows, formData.pricing_type);
      setLoading(true);
      const fd = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === 'weight_price_rows') return;
        if (key === 'price_per_kg') return;
        fd.append(key, formData[key]);
      });
      fd.set('weight_display_unit', derivedUnit);
      if (formData.pricing_type !== 'per_piece') {
        fd.set('stock_quantity', String(parseFloat(formData.stock_quantity) || 0));
      }
      fd.set('weight_price_overrides', JSON.stringify(overrides));
      selectedImages.slice(0, 6).forEach(img => fd.append('images', img));
      await api.post('/admin/products', fd);
      setShowAddModal(false);
      resetForm();
      fetchProducts();
      toast.success('Product created successfully!');
    } catch (error) {
      console.error('handleAddProduct', error.response?.data || error.message);
      toast.error(formatApiErrorMessage(error, 'Failed to add product'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      const overrides = rowsToWeightOverrides(formData.weight_price_rows, formData.pricing_type);
      if (Object.keys(overrides).length === 0) {
        toast.error('Add at least one valid custom weight tier with price.');
        return;
      }
      const derivedUnit = deriveWeightDisplayUnit(formData.weight_price_rows, formData.pricing_type);
      setLoading(true);
      const fd = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'weight_price_rows') return;
        if (key === 'price_per_kg') return;
        if (formData[key] !== undefined && formData[key] !== null) fd.append(key, formData[key]);
      });
      fd.set('weight_display_unit', derivedUnit);
      if (formData.pricing_type !== 'per_piece') {
        fd.set('stock_quantity', String(parseFloat(formData.stock_quantity) || 0));
      }
      fd.set('weight_price_overrides', JSON.stringify(overrides));
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
      console.error('handleEditProduct', error.response?.data || error.message);
      toast.error(formatApiErrorMessage(error, 'Failed to update product'));
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
      toast.success('Product permanently deleted.');
    } catch (error) {
      console.error('handleDeleteProduct', error.response?.data || error.message);
      toast.error(formatApiErrorMessage(error, 'Failed to delete product.'));
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (productId, newQuantity) => {
    try {
      await api.put(`/admin/products/${productId}/stock`, { quantity: newQuantity });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, quantity_available: newQuantity } : p));
    } catch (error) {
      console.error('handleStockUpdate', error.response?.data || error.message);
      toast.error(formatApiErrorMessage(error, 'Failed to update stock.'));
    }
  };

  const openEditModal = (product) => {
    const pt = product.pricing_type || 'per_kg';
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      discount: product.discount || '',
      category: product.category || '',
      stock_quantity: product.pricing_type === 'per_piece'
        ? (product.quantity_available || '')
        : String(product.quantity_available ?? ''),
      image_url: product.image_url || '',
      is_active: product.is_active,
      pricing_type: pt,
      weight_display_unit: product.weight_display_unit === 'g' ? 'g' : 'kg',
      weight_price_rows: weightOverridesToRows(product.weight_price_overrides || {}, pt),
    });
    setExistingImages(product.image_url ? [{ id: product.id, url: product.image_url }] : []);
    setImagePreview([]);
    setSelectedImages([]);
    setShowEditModal(true);
  };

  const formatTierSummary = (kgW, price) => {
    const { weight, unit } = kgTierToDisplay(kgW);
    const pr = Number(price);
    return `₹${Number.isFinite(pr) ? pr.toFixed(0) : '0'}/${weight}${unit}`;
  };

  const priceDisplay = (p) => {
    const entries = Object.entries(p.weight_price_overrides || {})
      .map(([weight, price]) => ({ kg: parseFloat(weight), price: parseFloat(price) }))
      .filter((row) => Number.isFinite(row.kg) && row.kg > 0 && Number.isFinite(row.price) && row.price >= 0)
      .sort((a, b) => a.kg - b.kg);
    if (entries.length === 0) return '—';
    if (p.pricing_type === 'per_piece') {
      const parts = entries.slice(0, 3).map((e) => `₹${Number(e.price).toFixed(0)}/${e.kg} pc`);
      return entries.length > 3 ? `${parts.join(' · ')} …` : parts.join(' · ');
    }
    const parts = entries.slice(0, 3).map((e) => formatTierSummary(e.kg, e.price));
    return entries.length > 3 ? `${parts.join(' · ')} …` : parts.join(' · ');
  };

  const productHasSubKgTier = (p) => {
    if (p.pricing_type !== 'per_kg') return false;
    const o = p.weight_price_overrides || {};
    return Object.keys(o).some((k) => {
      const v = parseFloat(k);
      return Number.isFinite(v) && v > 0 && v < 1;
    });
  };

  const getStockStep = (p) => {
    if (p.pricing_type === 'per_piece') return 1;
    if (p.weight_display_unit === 'g') return 0.05;
    if (productHasSubKgTier(p)) return 0.01;
    return 1;
  };
  const formatStock = (p) => {
    const qty = Number(p.quantity_available || 0);
    if (p.pricing_type === 'per_piece') return `${qty} pc`;
    if (p.weight_display_unit === 'g') return `${Math.round(qty * 1000)} g`;
    return `${qty} kg`;
  };

  if (loading && products.length === 0) return <Loading />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Product Management</h1>
        <Button onClick={() => { resetForm(); setShowAddModal(true); }}>Add New Product</Button>
      </div>

      {/* Mobile product cards */}
      <div className="space-y-3 md:hidden mb-4">
        {products.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-500">No products found</div>
        ) : products.map(product => (
          <div key={product.id} className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex items-start gap-3">
              <img
                className="h-12 w-12 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                src={getImageUrl(product.image_url)}
                alt={product.name}
                width={IMAGE_DIMS.adminRow.width}
                height={IMAGE_DIMS.adminRow.height}
                loading="lazy"
                decoding="async"
                onError={(e) => { e.target.src = getPlaceholderImage(); }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{product.category || 'Uncategorized'}</p>
                <p className="text-xs font-medium text-gray-700 mt-1">{priceDisplay(product)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Stock: {formatStock(product)}
                </p>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {product.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => openEditModal(product)}>Edit</Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => { setSelectedProduct(product); setShowDeleteModal(true); }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Products Table */}
      <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
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
                      if (window.confirm('Add stock by configured unit step for all products?')) {
                        products.forEach(p => {
                          const step = getStockStep(p);
                          handleStockUpdate(p.id, parseFloat(((parseFloat(p.quantity_available) || 0) + step).toFixed(2)));
                        });
                      }
                    }} className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 px-2 py-0.5 rounded">+1 Step All</button>
                    <button onClick={() => {
                      if (window.confirm('Subtract stock by configured unit step for all products?')) {
                        products.forEach(p => {
                          const step = getStockStep(p);
                          handleStockUpdate(p.id, Math.max(0, parseFloat(((parseFloat(p.quantity_available) || 0) - step).toFixed(2))));
                        });
                      }
                    }} className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-600 px-2 py-0.5 rounded">-1 Step All</button>
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
                      <img
                        className="h-12 w-12 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                        src={getImageUrl(product.image_url)}
                        alt={product.name}
                        width={IMAGE_DIMS.adminRow.width}
                        height={IMAGE_DIMS.adminRow.height}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.target.src = getPlaceholderImage(); }}
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        {product.discount > 0 && (
                          <p className="text-xs text-green-600 font-medium">{product.discount}% off</p>
                        )}
                        <p className="text-[10px] text-gray-400">{product.pricing_type === 'per_piece' ? 'Per piece' : 'Weight tiers'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{product.category || 'Uncategorized'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 max-w-[14rem] leading-snug">{priceDisplay(product)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-1">
                      <button onClick={() => handleStockUpdate(product.id, parseFloat(((parseFloat(product.quantity_available) || 0) + getStockStep(product)).toFixed(2)))}
                        className="w-6 h-6 bg-green-100 hover:bg-green-200 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">+</button>
                      <span className="font-medium min-w-[2.5rem] text-center">
                        {formatStock(product)}
                      </span>
                      <button onClick={() => handleStockUpdate(product.id, Math.max(0, parseFloat(((parseFloat(product.quantity_available) || 0) - getStockStep(product)).toFixed(2))))}
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
                      className="bg-red-600 hover:bg-red-700">Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Product">
        <ProductForm
          formData={formData}
          handleInputChange={handleInputChange}
          categories={categories}
          categoriesLoading={categoriesLoading}
          loading={loading}
          onSubmit={handleAddProduct}
          onCancel={() => setShowAddModal(false)}
          submitLabel="Add Product"
          selectedImages={selectedImages}
          setSelectedImages={setSelectedImages}
          imagePreview={imagePreview}
          setImagePreview={setImagePreview}
          existingImages={existingImages}
          setExistingImages={setExistingImages}
          handleImageChange={handleImageChange}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Product">
        <ProductForm
          formData={formData}
          handleInputChange={handleInputChange}
          categories={categories}
          categoriesLoading={categoriesLoading}
          loading={loading}
          onSubmit={handleEditProduct}
          onCancel={() => setShowEditModal(false)}
          submitLabel="Update Product"
          selectedImages={selectedImages}
          setSelectedImages={setSelectedImages}
          imagePreview={imagePreview}
          setImagePreview={setImagePreview}
          existingImages={existingImages}
          setExistingImages={setExistingImages}
          handleImageChange={handleImageChange}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Product Permanently">
        <div className="space-y-4">
          <p className="text-gray-700">
            This will permanently delete <strong>"{selectedProduct?.name}"</strong> and cannot be undone.
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={loading}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteProduct} disabled={loading}
              className="bg-red-600 hover:bg-red-700">
              {loading ? 'Deleting...' : 'Delete Product'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductManager;
