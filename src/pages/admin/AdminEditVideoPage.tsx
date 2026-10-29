import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { VideoItem, CategoryItem } from '../../types';
import { api } from '../../lib/api';
import { getVideoThumbnailSources } from '../../lib/media';
import { useToast } from '../../context/ToastContext';
import { SafeImage } from '../../components/common/SafeImage';

export const AdminEditVideoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [video, setVideo] = useState<VideoItem | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Form Fields
  const [displayTitle, setDisplayTitle] = useState('');
  const [displayDescription, setDisplayDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'published' | 'draft' | 'archived'>('published');
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState(0);
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (!id) return;

    Promise.all([
      api.get<{ success: boolean; video: VideoItem }>(`/api/admin/videos/${id}`),
      api.get<{ success: boolean; categories: CategoryItem[] }>('/api/admin/categories'),
    ])
      .then(([videoRes, catRes]) => {
        if (videoRes.success && videoRes.video) {
          const v = videoRes.video;
          setVideo(v);
          setDisplayTitle(v.displayTitle);
          setDisplayDescription(v.displayDescription || '');
          setCategoryId(typeof v.categoryId === 'object' ? (v.categoryId as any)._id : v.categoryId || '');
          setStatus(v.status);
          setIsFeatured(v.isFeatured);
          setFeaturedOrder(v.featuredOrder || 0);
          setTagsInput(v.tags?.join(', ') || '');
        }
        if (catRes.success) {
          setCategories(catRes.categories || []);
        }
      })
      .catch((err) => {
        showToast(err.message || 'Failed to load video.', 'error');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSaving(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await api.put(`/api/admin/videos/${id}`, {
        displayTitle,
        displayDescription,
        categoryId: categoryId || undefined,
        status,
        isFeatured,
        featuredOrder,
        tags: parsedTags,
      });

      if (res.success) {
        showToast('Video updated successfully!', 'success');
        navigate('/admin/videos');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update video.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    if (!id) return;
    setIsSyncing(true);
    try {
      const res = await api.post<{ success: boolean; video: VideoItem; message: string }>(
        `/api/admin/videos/${id}/sync`
      );
      if (res.success && res.video) {
        setVideo(res.video);
        showToast(res.message || 'Metadata refreshed from YouTube.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Sync failed.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading || !video) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="h-8 w-48 bg-slate-900 rounded animate-pulse" />
        <div className="h-96 rounded-3xl bg-slate-900 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="space-y-1">
          <Link
            to="/admin/videos"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Videos Catalog
          </Link>
          <h2 className="text-2xl font-bold text-white tracking-tight">Edit Catalog Video</h2>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          Refresh from YouTube
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-800">
            <SafeImage
              src={getVideoThumbnailSources(video)[0]}
              fallbackSrcs={getVideoThumbnailSources(video).slice(1)}
              alt={video.displayTitle}
              className="w-36 aspect-video rounded-xl object-cover bg-slate-950"
            />
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                YouTube ID: {video.youtubeVideoId}
              </span>
              <p className="text-xs text-slate-400">Original Creator: <strong className="text-white">{video.channelTitle}</strong></p>
              <p className="text-xs text-slate-400 font-mono">Duration: {video.duration}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Display Title</label>
            <input
              type="text"
              required
              value={displayTitle}
              onChange={(e) => setDisplayTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Internal Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="">Unassigned</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Display Description</label>
            <textarea
              rows={4}
              value={displayDescription}
              onChange={(e) => setDisplayDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500 leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Tags (comma-separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Publication Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Featured in Hero?</label>
              <select
                value={isFeatured ? 'yes' : 'no'}
                onChange={(e) => setIsFeatured(e.target.value === 'yes')}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="no">Standard Catalog</option>
                <option value="yes">Hero Featured Stream</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Featured Priority Order</label>
              <input
                type="number"
                min={0}
                value={featuredOrder}
                onChange={(e) => setFeaturedOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Link
              to="/admin/videos"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Updating...' : 'Save Video Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
