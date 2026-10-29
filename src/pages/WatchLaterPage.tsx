import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Trash2, ArrowLeft, Play } from 'lucide-react';
import { WatchLaterItem } from '../types';
import { VideoCard } from '../components/common/VideoCard';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const WatchLaterPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [savedItems, setSavedItems] = useState<WatchLaterItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchWatchLater = () => {
    setIsLoading(true);
    api.get<{ success: boolean; savedVideos: WatchLaterItem[] }>('/api/watch-later')
      .then((res) => {
        if (res.success) setSavedItems(res.savedVideos || []);
      })
      .catch((err) => console.warn('[WatchLaterPage] Fetch error:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isAuthLoading && !user) {
      showToast('Please sign in to view your Watch Later list.', 'info');
      navigate('/login');
      return;
    }
    if (user) {
      fetchWatchLater();
    }
  }, [user, isAuthLoading, navigate]);

  const handleRemove = async (videoId: string) => {
    try {
      const res = await api.delete(`/api/watch-later/${videoId}`);
      if (res.success) {
        setSavedItems((prev) => prev.filter((item) => item.videoId._id !== videoId && item.youtubeVideoId !== videoId));
        showToast('Removed from Watch Later.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to remove from Watch Later.', 'error');
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
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20">
            <Bookmark className="w-3.5 h-3.5" />
            Saved Content
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Watch Later</h1>
          <p className="text-xs text-slate-400">
            Videos you have bookmarked to enjoy whenever you have time.
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-slate-300 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
          {savedItems.length} {savedItems.length === 1 ? 'Video' : 'Videos'}
        </span>
      </div>

      {/* Grid */}
      {savedItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {savedItems.map((item) => (
            <div key={item._id} className="relative group/card">
              <VideoCard
                video={item.videoId}
                onRemoveFromList={() => setSavedItems((prev) => prev.filter((entry) => entry._id !== item._id))}
              />
              <button
                onClick={() => handleRemove(item.videoId._id)}
                title="Remove from Watch Later"
                className="absolute top-2.5 right-12 z-20 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-slate-300 hover:text-white border border-white/10 opacity-0 group-hover/card:opacity-100 transition-all duration-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 rounded-3xl bg-slate-900/30 border border-slate-800/80 p-8">
          <Bookmark className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Your Watch Later queue is empty</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click the bookmark icon on any video card or watch page to save films for later.
          </p>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-colors"
          >
            Explore Catalog
          </Link>
        </div>
      )}
    </div>
  );
};
