import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Compass, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Layers, AlertCircle } from 'lucide-react';
import { VideoItem, CategoryItem } from '../types';
import { VideoCard } from '../components/common/VideoCard';
import { api } from '../lib/api';

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategory = searchParams.get('category') || 'all';
  const selectedSort = searchParams.get('sort') || 'latest';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  // Fetch categories list
  useEffect(() => {
    api.get<{ success: boolean; categories: CategoryItem[] }>('/api/categories')
      .then((res) => {
        if (res?.success && res.categories?.length > 0) {
          setCategories(res.categories);
        }
      })
      .catch((err) => console.warn('[ExplorePage] Categories fetch:', err));
  }, []);

  // Fetch videos based on filters
  useEffect(() => {
    let isCurrentRequest = true;
    setIsLoading(true);
    setFetchError(null);
    const query = new URLSearchParams({
      category: selectedCategory,
      sort: selectedSort,
      page: currentPage.toString(),
      limit: '12',
    });

    api.get<{ success: boolean; videos: VideoItem[]; total: number; totalPages: number }>(
      `/api/videos?${query.toString()}`
    )
      .then((res) => {
        if (!isCurrentRequest) return;
        if (res?.success) {
          setVideos(res.videos || []);
          setTotal(res.total || 0);
          setTotalPages(res.totalPages || 1);
        } else {
          setFetchError('The video catalog did not return a valid response.');
        }
      })
      .catch((err) => {
        if (isCurrentRequest) {
          setFetchError(err instanceof Error ? err.message : 'Failed to load videos.');
        }
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [selectedCategory, selectedSort, currentPage, reloadCount]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all' && key === 'category') {
      next.delete('category');
    } else {
      next.set(key, value);
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const next = new URLSearchParams(searchParams);
    next.set('page', newPage.toString());
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20">
          <Compass className="w-3.5 h-3.5" />
          Catalog Directory
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Explore VIDORA</h1>
        <p className="text-sm text-slate-400">
          Browse verified 4K productions, independent documentaries, and artistic visual shorts.
        </p>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => updateParam('category', 'all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => updateParam('category', cat.slug)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                selectedCategory === cat.slug
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
          </span>
          <select
            value={selectedSort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium focus:outline-none focus:border-rose-500"
          >
            <option value="latest">Latest Releases</option>
            <option value="popular">Most Popular</option>
            <option value="duration">Longest Duration</option>
          </select>
        </div>
      </div>

      {/* Video Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-video bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : fetchError ? (
        <div role="alert" className="py-20 text-center space-y-4 rounded-3xl bg-slate-900/30 border border-slate-800/80 p-8">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">Unable to load videos</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">{fetchError}</p>
          <button
            onClick={() => setReloadCount((count) => count + 1)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      ) : videos.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Showing page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong> ({total} total videos)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-200 border border-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-200 border border-slate-800 transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 rounded-3xl bg-slate-900/30 border border-slate-800/80 p-8">
          <Layers className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No videos found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            There are currently no published videos in this specific category. Try selecting another category or check back soon.
          </p>
          <button
            onClick={() => updateParam('category', 'all')}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};
