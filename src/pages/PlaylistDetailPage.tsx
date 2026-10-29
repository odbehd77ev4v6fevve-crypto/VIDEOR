import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, Film, Clock, Eye, Sparkles, User } from 'lucide-react';
import { PlaylistData } from '../types';
import { api } from '../lib/api';
import { SafeImage } from '../components/common/SafeImage';
import { getVideoThumbnailSources } from '../lib/media';

export const PlaylistDetailPage: React.FC = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playlistId) return;
    setIsLoading(true);
    setError(null);

    api.get<{ success: boolean; playlist: PlaylistData }>(`/api/playlists/${playlistId}`)
      .then((res) => {
        if (res.success && res.playlist) {
          setPlaylist(res.playlist);
        } else {
          setError('Playlist not found.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load playlist.');
      })
      .finally(() => setIsLoading(false));
  }, [playlistId]);

  if (isLoading) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="h-48 rounded-3xl bg-slate-900 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <Film className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Playlist Unavailable</h2>
        <p className="text-sm text-slate-400">{error || 'This playlist is either private or does not exist.'}</p>
        <Link
          to="/playlists"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Playlists
        </Link>
      </div>
    );
  }

  const author = typeof playlist.userId === 'object' ? playlist.userId : null;
  const firstVideo = playlist.videos[0]?.videoId;

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Playlist Hero Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800">
        <div className="relative aspect-video md:aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 shadow-2xl">
          {playlist.coverUrl ? (
            <SafeImage src={playlist.coverUrl} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
              <Film className="w-12 h-12" />
            </div>
          )}
        </div>

        <div className="md:col-span-2 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <Link
              to="/playlists"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Playlists
            </Link>

            <div className="flex items-center gap-2">
              {playlist.isCurated && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sparkles className="w-3 h-3" />
                  Official Curated Series
                </span>
              )}
              <span className="text-xs font-mono text-slate-400">
                {playlist.videos.length} {playlist.videos.length === 1 ? 'Video' : 'Videos'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {playlist.title}
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              {playlist.description || 'A hand-selected video compilation.'}
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
              <User className="w-3.5 h-3.5 text-rose-400" />
              <span>Curated by <strong className="text-white">{author?.displayName || 'Curator'}</strong></span>
            </div>
          </div>

          {firstVideo && (
            <div className="pt-4">
              <Link
                to={`/watch/${firstVideo.youtubeVideoId}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all hover:scale-105"
              >
                <Play className="w-4 h-4 fill-current" />
                Play All Sequentially
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Videos Tracklist */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 pb-2 border-b border-slate-800">
          Playlist Contents ({playlist.videos.length})
        </h2>

        {playlist.videos.map((item, index) => {
          const video = item.videoId;
          if (!video) return null;

          return (
            <div
              key={item._id}
              onClick={() => navigate(`/watch/${video.youtubeVideoId}`)}
              className="group flex items-center gap-4 p-3 rounded-2xl bg-slate-900/40 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all duration-200"
            >
              {/* Track Number */}
              <span className="w-6 text-center font-mono text-xs font-bold text-slate-500 group-hover:text-rose-400">
                {index + 1}
              </span>

              {/* Thumbnail */}
              <div className="relative w-28 sm:w-36 aspect-video rounded-xl overflow-hidden shrink-0 bg-slate-950">
                <SafeImage
                  src={getVideoThumbnailSources(video)[0]}
                  fallbackSrcs={getVideoThumbnailSources(video).slice(1)}
                  alt={video.displayTitle}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                {video.duration && (
                  <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[10px] font-mono bg-black/80 text-white">
                    {video.duration}
                  </span>
                )}
              </div>

              {/* Title & Channel */}
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="text-sm font-semibold text-slate-100 group-hover:text-rose-400 truncate transition-colors">
                  {video.displayTitle}
                </h4>
                <p className="text-xs text-slate-400 truncate">{video.channelTitle}</p>
              </div>

              {/* Play CTA Icon */}
              <div className="pr-4 shrink-0 text-slate-500 group-hover:text-rose-500 transition-colors">
                <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
