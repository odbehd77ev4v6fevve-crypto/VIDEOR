import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Film,
  Sparkles,
  Save,
  HelpCircle,
} from 'lucide-react';
import { CategoryItem } from '../../types';
import { api } from '../../lib/api';
import { getVideoThumbnailSources } from '../../lib/media';
import { useToast } from '../../context/ToastContext';
import { SafeImage } from '../../components/common/SafeImage';

interface PreviewMetadata {
  youtubeVideoId: string;
  originalUrl: string;
  originalTitle: string;
  originalDescription: string;
  channelId: string;
  channelTitle: string;
  duration: string;
  durationSeconds: number;
  publishedAt: string;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
    maxres?: string;
  };
  viewCount: number;
  likeCount: number;
  tags: string[];
  source: string;
}

export const AdminAddVideoPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Step 1: Input URL
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [preview, setPreview] = useState<PreviewMetadata | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewRequestIdRef = useRef(0);

  // Step 2: Form Overrides & Options
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [displayTitle, setDisplayTitle] = useState('');
  const [displayDescription, setDisplayDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load categories
  useEffect(() => {
    api.get<{ success: boolean; categories: CategoryItem[] }>('/api/admin/categories')
      .then((res) => {
        if (res.success) {
          setCategories(res.categories || []);
          if (res.categories && res.categories.length > 0) {
            setCategoryId(res.categories[0]._id);
          }
        }
      })
      .catch((err) => console.warn('[AdminAddVideo] Categories fetch:', err));
  }, []);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    const requestId = ++previewRequestIdRef.current;
    setIsValidating(true);
    setPreviewError(null);
    setPreview(null);

    try {
      const res = await api.post<{ success: boolean; metadata: PreviewMetadata }>(
        '/api/admin/videos/preview-url',
        { url: youtubeUrl.trim() }
      );

      if (requestId !== previewRequestIdRef.current) return;
      if (res.success && res.metadata) {
        setPreview(res.metadata);
        setDisplayTitle(res.metadata.originalTitle);
        setDisplayDescription(res.metadata.originalDescription || '');
        setTagsInput(res.metadata.tags?.join(', ') || '');
        showToast('YouTube video metadata successfully retrieved!', 'success');
      }
    } catch (err: any) {
      if (requestId === previewRequestIdRef.current) {
        setPreviewError(err.message || 'Failed to fetch YouTube metadata.');
      }
    } finally {
      if (requestId === previewRequestIdRef.current) {
        setIsValidating(false);
      }
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;

    setIsSubmitting(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await api.post('/api/admin/videos', {
        youtubeUrl,
        categoryId: categoryId || undefined,
        displayTitle: displayTitle.trim() || preview.originalTitle,
        displayDescription: displayDescription.trim(),
        tags: parsedTags,
        status,
        isFeatured,
        featuredOrder,
      });

      if (res.success) {
        showToast(`Video "${displayTitle || preview.originalTitle}" added to catalog!`, 'success');
        navigate('/admin/videos');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save video to database.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Link
          to="/admin/videos"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Videos Catalog
        </Link>
        <h2 className="text-2xl font-bold text-white tracking-tight">Add YouTube Video to Catalog</h2>
        <p className="text-xs text-slate-400">
          Enter a supported YouTube URL to retrieve official metadata and configure catalog parameters.
        </p>
      </div>

      {/* Step 1: Input URL and Validate */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
          1. Provide YouTube Video URL
        </h3>

        <form onSubmit={handlePreview} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            placeholder="e.g. https://www.youtube.com/watch?v=R6MlUcmOul8 or https://youtu.be/..."
            value={youtubeUrl}
            onChange={(e) => {
              previewRequestIdRef.current += 1;
              setIsValidating(false);
              setYoutubeUrl(e.target.value);
              setPreview(null);
              setPreviewError(null);
            }}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono text-xs"
          />
          <button
            type="submit"
            disabled={isValidating || !youtubeUrl.trim()}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            {isValidating ? 'Verifying...' : 'Verify & Fetch'}
          </button>
        </form>

        {previewError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{previewError}</span>
          </div>
        )}
      </div>

      {/* Step 2: Metadata Preview & Overrides (Rendered only after fetch) */}
      {preview && (
        <form onSubmit={handleFinalSubmit} className="space-y-6 animate-in fade-in slide-in-from-top-2">
          {/* Metadata Preview Box */}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                2. Verified YouTube Stream Metadata
              </h3>
              <span className="text-[11px] font-mono text-slate-400 uppercase bg-slate-800 px-2 py-0.5 rounded">
                Source: {preview.source}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <SafeImage
                src={getVideoThumbnailSources({youtubeVideoId: preview.youtubeVideoId, thumbnails: preview.thumbnails})[0]}
                fallbackSrcs={getVideoThumbnailSources({youtubeVideoId: preview.youtubeVideoId, thumbnails: preview.thumbnails}).slice(1)}
                alt={preview.originalTitle}
                className="w-full sm:w-56 aspect-video rounded-xl object-cover bg-slate-950 shadow"
              />
              <div className="space-y-1.5 flex-1 min-w-0">
                <h4 className="text-base font-bold text-white leading-snug">{preview.originalTitle}</h4>
                <p className="text-xs text-rose-400 font-semibold">{preview.channelTitle}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 font-mono">
                  <span>Duration: {preview.duration}</span>
                  <span>•</span>
                  <span>Views: {new Intl.NumberFormat().format(preview.viewCount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              3. VIDORA Presentation & Taxonomy
            </h3>

            {/* Display Title Override */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                VIDORA Display Title (Customizable)
              </label>
              <input
                type="text"
                required
                value={displayTitle}
                onChange={(e) => setDisplayTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Category Selector */}
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

            {/* Display Description Override */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                VIDORA Display Description (Customizable)
              </label>
              <textarea
                rows={4}
                value={displayDescription}
                onChange={(e) => setDisplayDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500 leading-relaxed"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Tags (comma-separated)</label>
              <input
                type="text"
                placeholder="Sci-Fi, 4K, Blender, Animation"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Status & Featured Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Publication Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="published">Published Immediately</option>
                  <option value="draft">Save as Draft</option>
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

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <Link
                to="/admin/videos"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving to Database...' : 'Save & Publish Video'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
