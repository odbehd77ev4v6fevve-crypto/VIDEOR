import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, Clock } from 'lucide-react';
import { WatchHistoryItem } from '../types';
import { VideoCard } from '../components/common/VideoCard';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ContinueWatchingPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      showToast('Please sign in to view your unfinished videos.', 'info');
      navigate('/login');
      return;
    }
    if (user) {
      api.get<{ success: boolean; continueWatching: WatchHistoryItem[] }>('/api/continue-watching')
        .then((res) => {
          if (res.success) setItems(res.continueWatching || []);
        })
        .catch((err) => console.warn('[ContinueWatchingPage] Fetch error:', err))
        .finally(() => setIsLoading(false));
    }
  }, [user, isAuthLoading, navigate]);

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
            <Play className="w-3.5 h-3.5 fill-current" />
            Resume Playback
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Continue Watching</h1>
          <p className="text-xs text-slate-400">
            In-progress videos you haven't finished yet.
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-slate-300 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
          {items.length} {items.length === 1 ? 'Video' : 'Videos'}
        </span>
      </div>

      {/* Grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item._id} className="space-y-2">
              <VideoCard
                video={item.videoId}
                progressPercent={item.completionPercent}
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="text-rose-400 font-medium">
                  {item.completionPercent}% Completed
                </span>
                <Link
                  to={`/watch/${item.youtubeVideoId}?start=${Math.max(0, Math.floor(item.positionSeconds))}`}
                  className="font-bold text-white hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  Resume <Play className="w-3 h-3 fill-current" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 rounded-3xl bg-slate-900/30 border border-slate-800/80 p-8">
          <Play className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No unfinished videos</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When you pause a video halfway through, it will show up here so you can easily pick up where you left off.
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
