import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Video,
  PlusCircle,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle,
  Eye,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { VideoItem, CategoryItem } from '../../types';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { DotCircleLoader } from '../../components/common/DotCircleLoader';
import { SafeImage } from '../../components/common/SafeImage';
import { api } from '../../lib/api';
import { getVideoThumbnailSources } from '../../lib/media';
import { useToast } from '../../context/ToastContext';

export const AdminVideosPage: React.FC = () => {
  const { showToast } = useToast();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Actions
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<VideoItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load categories
  useEffect(() => {
    api.get<{ success: boolean; categories: CategoryItem[] }>('/api/admin/categories')
      .then((res) => {
        if (res.success) setCategories(res.categories || []);
      })
      .catch((err) => console.warn('[AdminVideos] Categories fetch:', err));
  }, []);

  // Load videos
  const fetchVideos = (targetPage = page) => {
    setIsLoading(true);
    const query = new URLSearchParams({
      page: targetPage.toString(),
      limit: '15',
      status: statusFilter,
      category: categoryFilter,
      search: searchQuery,
    });

    api.get<{ success: boolean; videos: VideoItem[]; total: number; totalPages: number }>(
      `/api/admin/videos?${query.toString()}`
    )
      .then((res) => {
        if (res.success) {
          setVideos(res.videos || []);
          setTotal(res.total || 0);
          setTotalPages(res.totalPages || 1);
        }
      })
      .catch((err) => console.warn('[AdminVideos] Videos fetch:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchVideos(1);
    setPage(1);
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVideos(1);
    setPage(1);
  };

  const handleToggleStatus = async (video: VideoItem) => {
    const newStatus = video.status === 'published' ? 'draft' : 'published';
    try {
      const res = await api.put(`/api/admin/videos/${video._id}`, { status: newStatus });
      if (res.success) {
        setVideos((prev) =>
          prev.map((v) => (v._id === video._id ? { ...v, status: newStatus } : v))
        );
        showToast(`Video marked as ${newStatus}.`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update video status.', 'error');
    }
  };

  const handleSyncMetadata = async (video: VideoItem) => {
    setSyncingId(video._id);
    try {
      const res = await api.post<{ success: boolean; video: VideoItem; message: string }>(
        `/api/admin/videos/${video._id}/sync`
      );
      if (res.success && res.video) {
        setVideos((prev) => prev.map((v) => (v._id === video._id ? res.video : v)));
        showToast(res.message || 'Metadata refreshed.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to sync metadata.', 'error');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/api/admin/videos/${videoToDelete._id}`);
      if (res.success) {
        setVideos((prev) => prev.filter((v) => v._id !== videoToDelete._id));
        setTotal((prev) => prev - 1);
        showToast(res.message || 'Video removed from catalog.', 'success');
        setVideoToDelete(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete video.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Videos Catalog</h2>
          <p className="text-xs text-slate-400">
            Manage published YouTube videos, publication status, and metadata synchronization.
          </p>
        </div>

        <Link
          to="/admin/videos/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-semibold shadow-md shadow-rose-950/40 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Add YouTube Video
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by title, creator, or YouTube ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="archived">Archived</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Videos Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="p-4">Video</th>
                <th className="p-4">Category</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Status</th>
                <th className="p-4">Views</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <DotCircleLoader size="md" variant="rose" label="Loading catalog records..." />
                  </td>
                </tr>
              ) : videos.length > 0 ? (
                videos.map((video) => (
                  <tr key={video._id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Video Column */}
                    <td className="p-4">
                      <div className="flex items-center gap-3 max-w-md">
                        <SafeImage
                          src={getVideoThumbnailSources(video)[0]}
                          fallbackSrcs={getVideoThumbnailSources(video).slice(1)}
                          alt={video.displayTitle}
                          className="w-20 aspect-video rounded-lg object-cover bg-slate-950 shrink-0"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <Link
                            to={`/watch/${video.youtubeVideoId}`}
                            className="font-bold text-white hover:text-rose-400 truncate block transition-colors"
                          >
                            {video.displayTitle}
                          </Link>
                          <p className="text-[11px] text-slate-400 truncate">{video.channelTitle}</p>
                          <span className="text-[10px] font-mono text-slate-500">ID: {video.youtubeVideoId}</span>
                        </div>
                      </div>
                    </td>

                    {/* Category Column */}
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
                        {video.categorySlug || 'Unassigned'}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="p-4 font-mono text-slate-300">{video.duration || '0:00'}</td>

                    {/* Status Badge */}
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStatus(video)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                          video.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : video.status === 'draft'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                        }`}
                        title="Click to toggle status"
                      >
                        {video.status}
                      </button>
                    </td>

                    {/* Views */}
                    <td className="p-4 font-mono text-slate-400">
                      <div>YT: {new Intl.NumberFormat().format(video.viewCount)}</div>
                      <div className="text-[10px] text-slate-500">VIDORA: {video.viewsOnVidora}</div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSyncMetadata(video)}
                          disabled={syncingId === video._id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                          title="Refresh metadata from YouTube"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingId === video._id ? 'animate-spin' : ''}`} />
                        </button>

                        <Link
                          to={`/admin/videos/${video._id}/edit`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title="Edit details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => setVideoToDelete(video)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete from catalog"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 space-y-2">
                    <p className="text-sm font-semibold text-slate-400">No videos match your filters.</p>
                    <Link
                      to="/admin/videos/new"
                      className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:underline"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add a new video now
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {page} of {totalPages} ({total} total videos)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const nextP = Math.max(1, page - 1);
                  setPage(nextP);
                  fetchVideos(nextP);
                }}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const nextP = Math.min(totalPages, page + 1);
                  setPage(nextP);
                  fetchVideos(nextP);
                }}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(videoToDelete)}
        onClose={() => setVideoToDelete(null)}
        onConfirm={handleDeleteVideo}
        title="Remove Video from Catalog?"
        message={`Are you sure you want to permanently remove "${videoToDelete?.displayTitle}" from VIDORA? This will also remove it from any playlists.`}
        confirmLabel="Delete Video"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};
