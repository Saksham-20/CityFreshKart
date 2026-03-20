import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Button from '../ui/Button';

const DEFAULT_NEW_CATEGORY = '';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState(DEFAULT_NEW_CATEGORY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    setError('');
    try {
      setLoading(true);
      const res = await api.get('/admin/categories');
      setCategories(res.data?.data?.categories || []);
    } catch (e) {
      setError('Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/admin/categories', { name });
      const updated = res.data?.data?.categories || [];
      setCategories(updated);
      setNewCategory('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name) => {
    const ok = window.confirm(`Delete category "${name}"? This will remove it from dropdowns immediately.`);
    if (!ok) return;
    setSaving(true);
    setError('');
    try {
      const encoded = encodeURIComponent(name);
      const res = await api.delete(`/admin/categories/${encoded}`);
      const updated = res.data?.data?.categories || [];
      setCategories(updated);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete category');
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async (currentName) => {
    const next = window.prompt('Rename category to:', currentName);
    if (!next) return;
    const newName = next.trim();
    if (!newName || newName === currentName) return;

    setSaving(true);
    setError('');
    try {
      const res = await api.put('/admin/categories', { oldName: currentName, newName });
      const updated = res.data?.data?.categories || [];
      setCategories(updated);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to rename category');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <p className="text-sm text-gray-500">Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Product Categories</h2>
          <p className="text-sm text-gray-600 mt-1">Add or remove categories used across the app.</p>
        </div>
        <Button variant="outline" onClick={fetchCategories} disabled={saving}>
          Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name (e.g. Vegetables)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-fresh-green focus:border-transparent outline-none"
          disabled={saving}
        />
        <Button onClick={handleAdd} disabled={saving || !newCategory.trim()}>
          {saving ? 'Saving...' : 'Add'}
        </Button>
      </div>

      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-sm text-gray-500">No categories configured.</p>
        ) : (
          categories.map((c) => (
            <div
              key={c}
              className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2"
            >
              <span className="text-sm font-semibold text-gray-900">{c}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleRename(c)} disabled={saving}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(c)} disabled={saving}>
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryManager;

