import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Bookmark, Check, Eye } from 'lucide-react';
import { VideoItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { getVideoThumbnailSources } from '../../lib/media';
import { SafeImage } from './SafeImage';

interface VideoCardProps {
  video: VideoItem;
  progressPercent?: number;
  onRemoveFromList?: () => void;
  showRemoveButton?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  progressPercent,
  onRemoveFromList,
  showRemoveButton,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    setIsSaved(false);
    if (!user) return;

    api.get<{ success: boolean; isSaved: boolean }>(`/api/watch-later/check/${video._id}`)
      .then((res) => {
        if (!isCancelled && res.success) setIsSaved(res.isSaved);
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [user, video._id]);

  // Format view count nicely
  const formatViews = (views: number) => {
    if (!views) return '0 views';
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  };

  // Format publication date relative or standard
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    if (diffMonths < 1) return 'Recently';
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;
    const years = Math.floor(diffMonths / 12);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  };

  const handleToggleWatchLater = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      showToast('Please sign in to save videos to Watch Later.', 'info');
      navigate('/login');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      const res = await api.post<{ success: boolean; isSaved: boolean; message: string }>(
        '/api/watch-later/toggle',
        { videoId: video._id, youtubeVideoId: video.youtubeVideoId }
      );
      if (res.success) {
        setIsSaved(res.isSaved);
        showToast(res.message, 'success');
        if (!res.isSaved && onRemoveFromList) {
          onRemoveFromList();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update Watch Later.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const thumbnailSources = getVideoThumbnailSources(video);
  const thumbnailSrc = thumbnailSources[0] ?? null;

  return (
    <div className="group relative flex flex-col rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/60 hover:-translate-y-1">
      {/* Thumbnail Area */}
      <Link
        to={`/watch/${video.youtubeVideoId}`}
        className="relative aspect-video w-full overflow-hidden bg-slate-950 block"
      >
        {thumbnailSrc ? (
          <SafeImage
            src={thumbnailSrc}
            fallbackSrcs={thumbnailSources.slice(1)}
            alt={video.displayTitle}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-500">
            <Play className="w-8 h-8 opacity-70" />
          </div>
        )}

        {/* Cinematic dark gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Play Icon Overlay on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg shadow-rose-950/60 scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Category Pill */}
        {video.categorySlug && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-slate-200 border border-white/10">
              {video.categorySlug.replace('-', ' ')}
            </span>
          </div>
        )}

        {/* Watch Later Quick Action Button */}
        <button
          onClick={handleToggleWatchLater}
          disabled={isSaving}
          className={`absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg backdrop-blur-md border transition-all duration-200 ${
            isSaved
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-black/60 text-slate-300 hover:text-white hover:bg-black/80 border-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100'
          }`}
          title={isSaved ? 'In Watch Later' : 'Add to Watch Later'}
          aria-label="Toggle Watch Later"
        >
          {isSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
        </button>

        {/* Duration Pill */}
        {video.duration && video.duration !== '0:00' && (
          <div className="absolute bottom-2.5 right-2.5 z-10">
            <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-black/80 text-white backdrop-blur-md">
              {video.duration}
            </span>
          </div>
        )}

        {/* Continue Watching Progress Bar */}
        {typeof progressPercent === 'number' && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
            <div
              className="h-full bg-rose-500"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        )}
      </Link>

      {/* Info Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div>
          <Link
            to={`/watch/${video.youtubeVideoId}`}
            className="text-sm font-semibold text-slate-100 hover:text-rose-400 line-clamp-2 transition-colors leading-snug"
            title={video.displayTitle}
          >
            {video.displayTitle}
          </Link>

          {/* Channel Name */}
          <div className="mt-1 flex items-center gap-1.5">
            {video.channelId ? (
              <Link
                to={`/channels/${video.channelId}`}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors truncate"
              >
                {video.channelTitle}
              </Link>
            ) : (
              <span className="text-xs text-slate-400 truncate">{video.channelTitle}</span>
            )}
          </div>
        </div>

        {/* Metadata Footer: Views and Date */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-slate-400" />
            {formatViews(video.viewCount)}
          </span>
          <span>{formatDate(video.publishedAt)}</span>
        </div>
      </div>
    </div>
  );
};
