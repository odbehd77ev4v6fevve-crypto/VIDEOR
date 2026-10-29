import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Play,
  Bookmark,
  Check,
  Share2,
  Flag,
  ListPlus,
  ExternalLink,
  Eye,
  Calendar,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { VideoItem, PlaylistData } from '../types';
import { YouTubePlayer } from '../components/common/YouTubePlayer';
import { VideoCard } from '../components/common/VideoCard';
import { Modal } from '../components/common/Modal';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { SafeImage } from '../components/common/SafeImage';
import { getVideoThumbnailSources } from '../lib/media';
import { useToast } from '../context/ToastContext';

export const WatchPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [video, setVideo] = useState<VideoItem | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);

  // Modals state
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // Playlists state for adding video
  const [userPlaylists, setUserPlaylists] = useState<PlaylistData[]>([]);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState<string>('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState<boolean>(false);

  // Report state
  const [reportReason, setReportReason] = useState<string>('broken');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

  const handleHistorySaved = useCallback(() => {
    showToast('Saved to your Watch History.', 'success');
  }, [showToast]);

  // Fetch video details and check watch later status
  useEffect(() => {
    if (!videoId) return;
    setIsLoading(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    api.get<{ success: boolean; video: VideoItem; relatedVideos: VideoItem[] }>(
      `/api/videos/${videoId}`
    )
      .then((res) => {
        if (res?.success && res.video) {
          setVideo(res.video);
          setRelatedVideos(res.relatedVideos || []);
        } else {
          setError('Video not found.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load video.');
      })
      .finally(() => setIsLoading(false));
  }, [videoId]);

  // Check Watch Later status if authenticated
  useEffect(() => {
    if (!user || !video) {
      setIsSaved(false);
      return;
    }

    api.get<{ success: boolean; isSaved: boolean }>(`/api/watch-later/check/${video._id}`)
      .then((res) => {
        if (res.success) setIsSaved(res.isSaved);
      })
      .catch(() => {});
  }, [user, video]);

  // Fetch user playlists when playlist modal opens
  const handleOpenPlaylistModal = () => {
    if (!user) {
      showToast('Please sign in to add videos to your playlists.', 'info');
      navigate('/login');
      return;
    }

    setIsPlaylistModalOpen(true);
    api.get<{ success: boolean; playlists: PlaylistData[] }>('/api/playlists/mine')
      .then((res) => {
        if (res.success) setUserPlaylists(res.playlists || []);
      })
      .catch((err) => console.warn('[WatchPage] User playlists fetch:', err));
  };

  const handleToggleWatchLater = async () => {
    if (!user) {
      showToast('Please sign in to save videos to Watch Later.', 'info');
      navigate('/login');
      return;
    }

    if (!video) return;

    try {
      const res = await api.post<{ success: boolean; isSaved: boolean; message: string }>(
        '/api/watch-later/toggle',
        { videoId: video._id, youtubeVideoId: video.youtubeVideoId }
      );
      if (res.success) {
        setIsSaved(res.isSaved);
        showToast(res.message, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update Watch Later.', 'error');
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!video) return;
    try {
      const res = await api.post(`/api/playlists/${playlistId}/videos`, {
        videoId: video._id,
      });
      if (res.success) {
        showToast('Video added to playlist!', 'success');
        setIsPlaylistModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to add to playlist.', 'error');
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim() || !video) return;

    setIsCreatingPlaylist(true);
    try {
      const res = await api.post<{ success: boolean; playlist: PlaylistData }>('/api/playlists', {
        title: newPlaylistTitle.trim(),
        initialVideoId: video._id,
      });
      if (res.success) {
        showToast(`Created playlist "${res.playlist.title}"!`, 'success');
        setNewPlaylistTitle('');
        setIsPlaylistModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create playlist.', 'error');
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Watch page link copied to clipboard!', 'success');
      setIsShareModalOpen(false);
    } catch {
      showToast('Clipboard access was blocked. Copy the link from the address bar.', 'error');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video) return;

    setIsSubmittingReport(true);
    try {
      const res = await api.post('/api/reports', {
        videoId: video._id,
        youtubeVideoId: video.youtubeVideoId,
        reason: reportReason,
        details: reportDetails,
        reporterEmail: user?.email,
      });
      if (res.success) {
        showToast('Thank you. Your report has been submitted to moderators.', 'success');
        setIsReportModalOpen(false);
        setReportDetails('');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit report.', 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const formatNumber = (num: number) => {
    if (!num) return '0';
    return new Intl.NumberFormat().format(num);
  };

  if (isLoading) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="aspect-video w-full rounded-2xl bg-slate-900 animate-pulse border border-slate-800" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 bg-slate-900 rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-slate-900 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Video Unavailable</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          {error || 'This video is either unpublished, archived, or does not exist in our catalog.'}
        </p>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
        >
          Explore Catalog
        </Link>
      </div>
    );
  }

  const categoryObj = typeof video.categoryId === 'object' ? video.categoryId : null;

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Player & Video Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* YouTube Embedded Cinema Player */}
          <YouTubePlayer
            videoId={video._id}
            youtubeVideoId={video.youtubeVideoId}
            durationSeconds={video.durationSeconds}
            initialTimeSeconds={Math.max(0, Number(searchParams.get('start')) || 0)}
            title={video.displayTitle}
            onHistorySaved={handleHistorySaved}
          />

          {/* Video Metadata Header */}
          <div className="space-y-4">
            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
              {video.displayTitle}
            </h1>

            {/* Action Bar & Stats */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              {/* Channel and Category */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow">
                  {video.channelTitle ? video.channelTitle[0].toUpperCase() : 'C'}
                </div>
                <div>
                  {video.channelId ? (
                    <Link
                      to={`/channels/${video.channelId}`}
                      className="text-sm font-bold text-white hover:text-rose-400 transition-colors block"
                    >
                      {video.channelTitle}
                    </Link>
                  ) : (
                    <span className="text-sm font-bold text-white block">{video.channelTitle}</span>
                  )}
                  {video.categorySlug && (
                    <Link
                      to={`/categories/${video.categorySlug}`}
                      className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 hover:underline"
                    >
                      {video.categorySlug.replace('-', ' ')}
                    </Link>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Watch Later Button */}
                <button
                  onClick={handleToggleWatchLater}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isSaved
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {isSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  {isSaved ? 'Saved' : 'Watch Later'}
                </button>

                {/* Add to Playlist Button */}
                <button
                  onClick={handleOpenPlaylistModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  Playlist
                </button>

                {/* Share Button */}
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>

                {/* Report Button */}
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  title="Report video"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-slate-800/60 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Statistics Bar */}
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400 py-1">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Eye className="w-4 h-4 text-slate-500" />
                {formatNumber(video.viewCount)} YouTube Views
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                {video.viewsOnVidora} VIDORA Views
              </span>
              {video.likeCount > 0 && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <ThumbsUp className="w-3.5 h-3.5 text-slate-500" />
                  {formatNumber(video.likeCount)} Likes
                </span>
              )}
              <span className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {new Date(video.publishedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <a
                href={video.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors"
              >
                Watch on YouTube
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Description Box */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-3">
              <p className={`text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed ${
                !isDescriptionExpanded ? 'line-clamp-3' : ''
              }`}>
                {video.displayDescription || video.originalDescription || 'No description provided.'}
              </p>

              {(video.displayDescription || video.originalDescription)?.length > 200 && (
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                >
                  {isDescriptionExpanded ? (
                    <>
                      Show Less <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      Show More <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}

              {/* Tags */}
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/60">
                  {video.tags.map((tag, idx) => (
                    <Link
                      key={idx}
                      to={`/search?q=${encodeURIComponent(tag)}`}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Related Videos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Related Discovery
            </h2>
            <Link to="/explore" className="text-xs text-rose-400 hover:underline">
              Browse More
            </Link>
          </div>

          <div className="space-y-3">
            {relatedVideos.map((item) => (
              <div
                key={item._id}
                onClick={() => navigate(`/watch/${item.youtubeVideoId}`)}
                className="group flex gap-3 p-2 rounded-xl hover:bg-slate-900/70 border border-transparent hover:border-slate-800 cursor-pointer transition-all"
              >
                <div className="relative w-32 aspect-video rounded-lg overflow-hidden shrink-0 bg-slate-950">
                  <SafeImage
                    src={getVideoThumbnailSources(item)[0]}
                    fallbackSrcs={getVideoThumbnailSources(item).slice(1)}
                    alt={item.displayTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {item.duration && (
                    <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[10px] font-mono bg-black/80 text-white">
                      {item.duration}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-rose-400 line-clamp-2 transition-colors">
                    {item.displayTitle}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">{item.channelTitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Share Video">
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Copy the direct VIDORA watch link to share this video with friends.
          </p>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
            <input
              type="text"
              readOnly
              value={typeof window !== 'undefined' ? window.location.href : ''}
              className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-colors"
            >
              Copy Link
            </button>
          </div>
        </div>
      </Modal>

      {/* Playlist Modal */}
      <Modal isOpen={isPlaylistModalOpen} onClose={() => setIsPlaylistModalOpen(false)} title="Add to Playlist">
        <div className="space-y-6">
          {/* Existing Playlists */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Playlists</h4>
            {userPlaylists.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {userPlaylists.map((pl) => (
                  <button
                    key={pl._id}
                    onClick={() => handleAddToPlaylist(pl._id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-left border border-slate-800 text-xs font-medium text-slate-200 transition-colors"
                  >
                    <span>{pl.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {pl.videoCount || 0} items
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">You have no playlists yet.</p>
            )}
          </div>

          {/* Create New Playlist */}
          <form onSubmit={handleCreatePlaylist} className="pt-4 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Create New Playlist</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New playlist title..."
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={isCreatingPlaylist || !newPlaylistTitle.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
              >
                Create & Add
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Report Modal */}
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Report Video">
        <form onSubmit={handleSubmitReport} className="space-y-4">
          <p className="text-xs text-slate-400">
            Submit a concern regarding this video to the VIDORA moderation team.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Reason</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="broken">Broken stream or unavailable video</option>
              <option value="inappropriate">Inappropriate or abusive content</option>
              <option value="copyright">Copyright violation</option>
              <option value="misleading">Misleading title or thumbnails</option>
              <option value="other">Other issue</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Additional Details (Optional)</label>
            <textarea
              rows={3}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingReport}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-colors"
            >
              {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
