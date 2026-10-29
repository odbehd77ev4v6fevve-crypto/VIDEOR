import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Trash2, ArrowLeft, Play, AlertCircle } from 'lucide-react';
import { WatchHistoryItem } from '../types';
import { VideoCard } from '../components/common/VideoCard';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const HistoryPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [historyItems, setHistoryItems] = useState<WatchHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const requestVersionRef = React.useRef(0);

  const fetchHistory = (nextPage = 1, append = false) => {
    const requestVersion = ++requestVersionRef.current;
    setIsLoading(true);
    setError(null);
    api.get<{ success: boolean; history: WatchHistoryItem[]; total: number; totalPages: number }>(
      `/api/history?page=${nextPage}&limit=15`
    )
      .then((res) => {
        if (requestVersion !== requestVersionRef.current) return;
        if (!res.success) throw new Error('Failed to load your watch history.');
        setHistoryItems((current) => append ? [...current, ...(res.history || [])] : (res.history || []));
        setTotal(res.total || 0);
        setPage(nextPage);
        setHasMore(nextPage < (res.totalPages || 1));
      })
      .catch((err) => {
        if (requestVersion === requestVersionRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load your watch history.');
        }
      })
      .finally(() => {
        if (requestVersion === requestVersionRef.current) setIsLoading(false);
      });
  };

  useEffect(() => {
    if (!isAuthLoading && !user) {
      showToast('Please sign in to view your Watch History.', 'info');
      navigate('/login');
      return;
    }
    if (user) {
      fetchHistory();
    }
  }, [user, isAuthLoading, navigate]);

  const handleRemoveItem = async (videoId: string) => {
    try {
      const res = await api.delete(`/api/history/${videoId}`);
      if (res.success) {
        setHistoryItems((prev) => prev.filter((item) => item.videoId._id !== videoId && item.youtubeVideoId !== videoId));
        setTotal((prev) => {
          const nextTotal = Math.max(0, prev - 1);
          setHasMore(page < Math.ceil(nextTotal / 15));
          return nextTotal;
        });
        showToast('Removed from watch history.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to remove entry.', 'error');
    }
  };

  const handleClearAllHistory = async () => {
    setIsClearing(true);
    try {
      const res = await api.delete('/api/history');
      if (res.success) {
        setHistoryItems([]);
        setTotal(0);
        setHasMore(false);
        showToast('Your watch history has been completely cleared.', 'success');
        setIsClearModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to clear history.', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-10 w-48 bg-slate-900 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-video bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20">
            <Clock className="w-3.5 h-3.5" />
            Playback Log
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Watch History</h1>
          <p className="text-xs text-slate-400">
            {total} {total === 1 ? 'video' : 'videos'} watched and saved to your history.
          </p>
        </div>

        {historyItems.length > 0 && (
          <button
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-800 hover:border-rose-900 text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All History
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-5 text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
          <p className="text-sm text-slate-300">{error}</p>
          <button
            type="button"
            onClick={() => fetchHistory(page, page > 1)}
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm font-semibold text-white hover:border-rose-500"
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid */}
      {historyItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {historyItems.map((item) => (
            <div key={item._id} className="relative group/card">
              <VideoCard
                video={item.videoId}
                progressPercent={item.completionPercent}
              />
              <button
                onClick={() => handleRemoveItem(item.videoId._id)}
                title="Remove from history"
                aria-label="Remove from watch history"
                className="absolute top-2.5 right-12 z-20 p-2 rounded-lg bg-black/80 hover:bg-rose-600 focus-visible:bg-rose-600 text-slate-200 border border-white/10 opacity-100 transition-all duration-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 rounded-3xl bg-slate-900/30 border border-slate-800/80 p-8">
          <Clock className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No watch history found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Videos you watch on VIDORA will automatically record your progress here so you can continue viewing.
          </p>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-colors"
          >
            Start Watching
          </Link>
        </div>
      )}

      {hasMore && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => fetchHistory(page + 1, true)}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-sm font-semibold text-white hover:border-rose-500 disabled:opacity-60"
          >
            {isLoading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearAllHistory}
        title="Clear Entire Watch History?"
        message="Are you sure you want to permanently clear your watch history? This action cannot be undone and your playback progress checkpoints will be reset."
        confirmLabel="Yes, Clear History"
        isDestructive={true}
        isLoading={isClearing}
      />
    </div>
  );
};
