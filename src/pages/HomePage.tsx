import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, Flame, Sparkles, Compass, ChevronRight, Layers, Film } from 'lucide-react';
import { HomepageData, VideoItem, WatchHistoryItem } from '../types';
import { VideoCard } from '../components/common/VideoCard';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { SafeImage } from '../components/common/SafeImage';
import { getVideoThumbnailSources } from '../lib/media';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<HomepageData | null>(null);
  const [continueWatching, setContinueWatching] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchHomepage = async () => {
    try {
      const res = await api.get<{ success: boolean } & HomepageData>('/api/homepage');
      if (res && res.success && res.hero) {
        setData(res);
        setFetchError(null);
      } else {
        setFetchError('The discovery catalog did not return a valid response.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to load the discovery catalog.';
      setFetchError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHomepage();
  }, []);

  // Fetch continue watching if user is authenticated
  useEffect(() => {
    if (!user) {
      setContinueWatching([]);
      return;
    }

    api.get<{ success: boolean; continueWatching: WatchHistoryItem[] }>('/api/continue-watching')
      .then((res) => {
        if (res.success) {
          setContinueWatching(res.continueWatching || []);
        }
      })
      .catch((err) => console.warn('Could not fetch continue watching:', err));
  }, [user]);

  if (isLoading && !data) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Hero Skeleton */}
        <div className="w-full aspect-[21/9] rounded-3xl bg-slate-900/80 animate-pulse border border-slate-800" />
        {/* Sections Skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-48 bg-slate-900 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-video bg-slate-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (fetchError && !data) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
          <Film className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Connecting to Discovery Catalog</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">{fetchError}</p>
        <button
          onClick={fetchHomepage}
          className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const heroVideo = data?.hero?.video;
  const heroImageSources = getVideoThumbnailSources(heroVideo);
  const heroImage = heroImageSources[0] ?? null;
  const heroTitle = data?.hero?.customTitle || heroVideo?.displayTitle;
  const heroSubtitle = data?.hero?.customSubtitle || heroVideo?.displayDescription;
  const heroBadge = data?.hero?.customBadge || 'FEATURED CINEMA';

  return (
    <div className="flex-1 flex flex-col pb-16 space-y-12">
      {/* Cinematic Hero Section */}
      {heroVideo && (
        <section className="relative w-full bg-[#050608] border-b border-slate-800/80 overflow-hidden">
          {/* Background Backdrop Image */}
          <div className="absolute inset-0 z-0">
            {heroImage ? (
              <SafeImage
                src={heroImage}
                fallbackSrcs={heroImageSources.slice(1)}
                alt={heroTitle || 'Featured'}
                className="w-full h-full object-cover object-center opacity-45 scale-105"
              />
            ) : null}
            {/* Vignette Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/80 to-[#090a0f]/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#090a0f] via-[#090a0f]/90 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_35%,transparent_0,rgba(9,10,15,0.22)_42%,rgba(9,10,15,0.78)_100%)]" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pb-20 md:py-24 lg:py-28">
            <div className="max-w-[46rem] space-y-5 sm:space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-rose-300">
                  {heroBadge}
                </span>
              </div>

              {/* Title */}
              <h1 className="max-w-[40rem] text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-[-0.035em] leading-[0.98] [text-wrap:balance] [text-shadow:0_3px_24px_rgba(0,0,0,.72)] break-words">
                {heroTitle}
              </h1>

              {/* Description */}
              {heroSubtitle && (
                <p className="max-w-2xl text-sm sm:text-base lg:text-lg text-slate-200/90 line-clamp-3 leading-7 [text-shadow:0_2px_12px_rgba(0,0,0,.85)]">
                  {heroSubtitle}
                </p>
              )}

              {/* Channel and Category Metadata */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300">
                <span className="font-semibold text-rose-400">{heroVideo.channelTitle}</span>
                <span>•</span>
                {heroVideo.duration && (
                  <span className="font-mono bg-black/60 px-2 py-0.5 rounded border border-white/10">
                    {heroVideo.duration}
                  </span>
                )}
                {heroVideo.categorySlug && (
                  <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800/80 text-slate-300">
                    {heroVideo.categorySlug.replace('-', ' ')}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-wrap items-center gap-3 sm:gap-4">
                <Link
                  to={`/watch/${heroVideo.youtubeVideoId}`}
                  className="inline-flex items-center justify-center gap-2 min-h-11 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-sm font-bold shadow-xl shadow-rose-950/60 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Watch Now
                </Link>
                <Link
                  to={`/watch/${heroVideo.youtubeVideoId}`}
                  className="inline-flex items-center justify-center gap-2 min-h-11 px-5 py-3 rounded-xl bg-slate-950/70 hover:bg-slate-900/90 text-slate-100 text-sm font-semibold border border-slate-600/80 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <Info className="w-4 h-4 text-slate-400" />
                  Video Details
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Discovery Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Categories Quick Navigation Bar */}
        {data?.topCategories && data.topCategories.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-rose-500" />
                Featured Categories
              </h3>
              <Link to="/categories" className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-medium">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
              {data.topCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/categories/${cat.slug}`}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-all hover:scale-105"
                >
                  <span>{cat.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                    {cat.videoCount}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Continue Watching Section (If authenticated and has items) */}
        {continueWatching.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Play className="w-4 h-4 text-rose-500 fill-current" />
                  Continue Watching
                </h2>
                <p className="text-xs text-slate-400">Pick up right where you left off</p>
              </div>
              <Link to="/continue-watching" className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-medium">
                View History <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {continueWatching.map((item) => (
                <VideoCard
                  key={item._id}
                  video={item.videoId}
                  progressPercent={item.completionPercent}
                />
              ))}
            </div>
          </section>
        )}

        {/* Dynamic Curated Sections */}
        {data?.sections && data.sections.map((section) => (
          <section key={section.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  {section.type === 'popular' && <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />}
                  {section.title}
                </h2>
                {section.subtitle && <p className="text-xs text-slate-400">{section.subtitle}</p>}
              </div>

              {section.categorySlug ? (
                <Link
                  to={`/categories/${section.categorySlug}`}
                  className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-medium"
                >
                  See More <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Link
                  to="/explore"
                  className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-medium"
                >
                  Explore All <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {section.videos.map((video) => (
                <VideoCard key={video._id} video={video} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
