import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Loading from '../components/ui/Loading';
import { getImageUrl, IMAGE_DIMS } from '../utils/imageUtils';

const emptyForm = () => ({
  title: '',
  subtitle: '',
  link_url: '',
  image_url: '',
  sort_order: '0',
  is_active: true,
});

const AdminMarketingBannersPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banners, setBanners] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [file, setFile] = useState(null);

  const fetchBanners = useCallback(async () => {
    try {
      const res = await api.get('/admin/marketing-banners');
      const list = res.data?.data?.banners || [];
      setBanners(Array.isArray(list) ? list : []);
    } catch {
      toast.error('Failed to load marketing banners');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchBanners();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchBanners]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFile(null);
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setForm({
      title: b.title || '',
      subtitle: b.subtitle || '',
      link_url: b.link_url || '',
      image_url: b.image_url || '',
      sort_order: String(b.sort_order ?? 0),
      is_active: Boolean(b.is_active),
    });
    setFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const sort = parseInt(form.sort_order, 10);
    if (!Number.isFinite(sort)) {
      toast.error('Sort order must be a number');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        if (file) {
          const fd = new FormData();
          fd.append('title', form.title);
          fd.append('subtitle', form.subtitle);
          fd.append('link_url', form.link_url);
          fd.append('sort_order', String(sort));
          fd.append('is_active', form.is_active ? 'true' : 'false');
          fd.append('image', file);
          await api.put(`/admin/marketing-banners/${editingId}`, fd);
        } else {
          await api.put(`/admin/marketing-banners/${editingId}`, {
            title: form.title,
            subtitle: form.subtitle,
            link_url: form.link_url,
            image_url: form.image_url,
            sort_order: sort,
            is_active: form.is_active,
          });
        }
        toast.success('Banner updated');
      } else {
        const hasFile = Boolean(file);
        const hasUrl = Boolean(String(form.image_url || '').trim());
        if (!hasFile && !hasUrl) {
          toast.error('Add an image file or image URL');
          return;
        }
        if (hasFile) {
          const fd = new FormData();
          fd.append('title', form.title);
          fd.append('subtitle', form.subtitle);
          fd.append('link_url', form.link_url);
          fd.append('sort_order', String(sort));
          fd.append('is_active', form.is_active ? 'true' : 'false');
          fd.append('image', file);
          await api.post('/admin/marketing-banners', fd);
        } else {
          await api.post('/admin/marketing-banners', {
            title: form.title,
            subtitle: form.subtitle,
            link_url: form.link_url,
            image_url: form.image_url,
            sort_order: sort,
            is_active: form.is_active,
          });
        }
        toast.success('Banner created');
      }
      resetForm();
      await fetchBanners();
    } catch (err) {
      const msg = err.response?.data?.message || 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await api.delete(`/admin/marketing-banners/${id}`);
      toast.success('Banner deleted');
      if (editingId === id) resetForm();
      await fetchBanners();
    } catch {
      toast.error('Delete failed');
    }
  };

  const moveBanner = async (index, delta) => {
    const j = index + delta;
    if (j < 0 || j >= banners.length) return;
    const arr = [...banners];
    const [removed] = arr.splice(index, 1);
    arr.splice(j, 0, removed);
    const items = arr.map((b, i) => ({ id: b.id, sort_order: i }));
    try {
      await api.put('/admin/marketing-banners/reorder', { items });
      toast.success('Order updated');
      await fetchBanners();
    } catch {
      toast.error('Reorder failed');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marketing banners</h1>
        <p className="text-sm text-gray-500 mt-1">
          Images and copy for the home page “Offers &amp; deals” carousel. Shown to customers above product highlights.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-gray-800">
          {editingId ? 'Edit banner' : 'Add banner'}
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="mb-title">Title</label>
            <input
              id="mb-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g. Weekend veg sale"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="mb-sort">Sort order</label>
            <input
              id="mb-sort"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="mb-sub">Subtitle</label>
          <textarea
            id="mb-sub"
            rows={2}
            value={form.subtitle}
            onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="Short line under the title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="mb-link">Link (optional)</label>
          <input
            id="mb-link"
            type="text"
            value={form.link_url}
            onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="/ or https://… or /?category=Vegetables"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="mb-file">Image file</label>
            <input
              id="mb-file"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-600"
            />
            {editingId && !file && form.image_url ? (
              <p className="text-xs text-gray-500 mt-1 truncate">Current: {form.image_url}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="mb-url">Or image URL</label>
            <input
              id="mb-url"
              type="text"
              value={form.image_url}
              onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
              disabled={Boolean(file)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
              placeholder="https://… or /uploads/…"
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="text-blue-600 text-lg mt-0.5">ℹ️</div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Recommended banner dimensions</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <p className="font-medium">Full banner</p>
                  <p className="text-blue-700">{IMAGE_DIMS.marketingBanner.width} × {IMAGE_DIMS.marketingBanner.height}px</p>
                </div>
                <div>
                  <p className="font-medium">Aspect ratio</p>
                  <p className="text-blue-700">2:1 (landscape)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Active (visible on storefront)</span>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : editingId ? 'Update banner' : 'Create banner'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">All banners ({banners.length})</h2>
        {banners.length === 0 ? (
          <p className="text-sm text-gray-500">No banners yet. Add one above.</p>
        ) : (
          <ul className="space-y-3">
            {banners.map((b, index) => (
              <li
                key={b.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
              >
                <div className="flex-shrink-0 w-full sm:w-36 h-20 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={getImageUrl(b.image_url)}
                    alt=""
                    width={IMAGE_DIMS.marketingBannerThumb.width}
                    height={IMAGE_DIMS.marketingBannerThumb.height}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{b.title || '(no title)'}</p>
                  {b.subtitle ? (
                    <p className="text-sm text-gray-600 line-clamp-2">{b.subtitle}</p>
                  ) : null}
                  <p className="text-xs text-gray-400 mt-1">
                    Order {b.sort_order}
                    {b.is_active ? '' : ' · hidden'}
                  </p>
                  {b.link_url ? (
                    <p className="text-xs text-blue-600 truncate mt-0.5">{b.link_url}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveBanner(index, -1)}
                      disabled={index === 0}
                      className="px-2 py-1 text-xs border rounded-lg disabled:opacity-40"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBanner(index, 1)}
                      disabled={index === banners.length - 1}
                      className="px-2 py-1 text-xs border rounded-lg disabled:opacity-40"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(b)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-800 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b.id)}
                    className="px-3 py-1.5 text-sm border border-red-200 text-red-700 rounded-lg hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminMarketingBannersPage;
