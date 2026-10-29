import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListVideo, Sparkles, Play, Film, Globe } from 'lucide-react';
import { PlaylistData } from '../types';
import { api } from '../lib/api';
import { SafeImage } from '../components/common/SafeImage';

export const PlaylistsPage: React.FC = () => {
  const [playlists, setPlaylists] = useState<PlaylistData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    api.get<{ success: boolean; playlists: PlaylistData[] }>('/api/playlists')
      .then((res) => {
        if (res.success) setPlaylists(res.playlists || []);
      })
      .catch((err) => console.warn('[PlaylistsPage] Fetch error:', err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20">
          <ListVideo className="w-3.5 h-3.5" />
          Curated Series
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Public Playlists & Collections</h1>
        <p className="text-sm text-slate-400">
          Curated suites and user-compiled series celebrating cinema, deep space, and technology.
        </p>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : playlists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {playlists.map((pl) => {
            const author = typeof pl.userId === 'object' ? pl.userId : null;
            return (
              <Link
                key={pl._id}
                to={`/playlists/${pl._id}`}
                className="group relative flex flex-col rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/50 hover:-translate-y-1"
              >
                {/* Cover Banner */}
                <div className="relative aspect-[16/9] w-full bg-slate-950 overflow-hidden">
                  {pl.coverUrl ? (
                    <SafeImage
                      src={pl.coverUrl}
                      alt={pl.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                      <Film className="w-10 h-10" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                  {pl.isCurated && (
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/90 text-slate-950 shadow">
                        <Sparkles className="w-3 h-3" />
                        Official Curated
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-2.5 right-2.5 z-10">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-black/80 text-white backdrop-blur-md">
                      {pl.videoCount || 0} Videos
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition-colors line-clamp-1">
                      {pl.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {pl.description || 'Curated video selection.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>By <strong className="text-slate-300">{author?.displayName || 'Curator'}</strong></span>
                    <span className="flex items-center gap-1 text-rose-400 font-semibold group-hover:translate-x-1 transition-transform">
                      <Play className="w-3 h-3 fill-current" /> Play Series
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 rounded-3xl bg-slate-900/30 border border-slate-800/80 p-8">
          <ListVideo className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No public playlists available</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Check back soon as new curated collections are published daily by our editorial staff.
          </p>
        </div>
      )}
    </div>
  );
};
