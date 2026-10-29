import React, { useEffect, useState } from 'react';
import { FolderTree, Plus, Edit, Trash2, Video, Film, Cpu, Rocket, Globe, Music, Compass, AlertCircle } from 'lucide-react';
import { CategoryItem } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { DotCircleLoader } from '../../components/common/DotCircleLoader';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export const AdminCategoriesPage: React.FC = () => {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Form
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Film');
  const [order, setOrder] = useState(0);
  const [status, setStatus] = useState<'published' | 'hidden'>('published');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = () => {
    setIsLoading(true);
    api.get<{ success: boolean; categories: CategoryItem[] }>('/api/admin/categories')
      .then((res) => {
        if (res.success) setCategories(res.categories || []);
      })
      .catch((err) => console.warn('[AdminCategories] Fetch categories:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setIcon('Film');
    setOrder(categories.length + 1);
    setStatus('published');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setIcon(cat.icon || 'Film');
    setOrder(cat.order || 0);
    setStatus(cat.status);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        const res = await api.put<{ success: boolean; category: CategoryItem }>(
          `/api/admin/categories/${editingCategory._id}`,
          { name, description, icon, order, status }
        );
        if (res.success) {
          showToast('Category updated.', 'success');
          fetchCategories();
          setIsModalOpen(false);
        }
      } else {
        const res = await api.post<{ success: boolean; category: CategoryItem }>(
          '/api/admin/categories',
          { name, slug, description, icon, order, status }
        );
        if (res.success) {
          showToast('Category created.', 'success');
          fetchCategories();
          setIsModalOpen(false);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Operation failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/api/admin/categories/${categoryToDelete._id}`);
      if (res.success) {
        showToast(res.message || 'Category deleted.', 'success');
        setCategories((prev) => prev.filter((c) => c._id !== categoryToDelete._id));
        setCategoryToDelete(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Category Directory Management</h2>
          <p className="text-xs text-slate-400">
            Define topics, slugs, ordering, and icons used for taxonomy and discovery filters.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-semibold shadow-md shadow-rose-950/40 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Categories Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
            <tr>
              <th className="p-4">Category</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Videos</th>
              <th className="p-4">Order</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <DotCircleLoader size="md" variant="rose" label="Loading category directory..." />
                </td>
              </tr>
            ) : categories.length > 0 ? (
              categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                        <FolderTree className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-white block">{cat.name}</span>
                        <p className="text-[11px] text-slate-400 max-w-xs truncate">{cat.description}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 font-mono text-slate-300">{cat.slug}</td>

                  <td className="p-4">
                    <span className="font-mono text-slate-200 font-semibold">{cat.videoCount}</span>
                  </td>

                  <td className="p-4 font-mono text-slate-400">{cat.order}</td>

                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        cat.status === 'published'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {cat.status}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Edit category"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCategoryToDelete(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No categories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Slug (URL Path)</label>
            <input
              type="text"
              required
              disabled={Boolean(editingCategory)}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-rose-500 disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Icon Theme</label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="Film">Film (Cinema)</option>
                <option value="Cpu">Cpu (Technology)</option>
                <option value="Rocket">Rocket (Space)</option>
                <option value="Globe">Globe (Documentary)</option>
                <option value="Music">Music (Audio)</option>
                <option value="Compass">Compass (Art & Discovery)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Display Order</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Visibility Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="published">Published (Visible in navigation & filters)</option>
              <option value="hidden">Hidden (Archived from public navigation)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-colors"
            >
              {isSubmitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Category?"
        message={`Are you sure you want to delete category "${categoryToDelete?.name}"? If any videos are linked, deletion will be blocked to maintain data integrity.`}
        confirmLabel="Delete Category"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};
