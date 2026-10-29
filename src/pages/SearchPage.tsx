import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ArrowUpDown, Filter, Sparkles } from 'lucide-react';
import { VideoItem } from '../types';
import { VideoCard } from '../components/common/VideoCard';
import { api } from '../lib/api';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const sortKey = searchParams.get('sort') || 'relevance';

  const [searchInput, setSearchInput] = useState(query);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersionRef = React.useRef(0);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    const requestVersion = ++requestVersionRef.current;
    setPage(1);
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams({
      q: query,
      sort: sortKey,
      page: '1',
      limit: '24',
    });

    api.get<{ success: boolean; videos: VideoItem[]; total: number; totalPages: number }>(
      `/api/search?${params.toString()}`
    )
      .then((res) => {
        if (res.success && requestVersion === requestVersionRef.current) {
          setVideos(res.videos || []);
          setTotal(res.total || 0);
          setHasMore((res.totalPages || 1) > 1);
        }
      })
      .catch((err) => {
        if (requestVersion === requestVersionRef.current) {
          setError(err instanceof Error ? err.message : 'Search is temporarily unavailable.');
          setVideos([]);
          setTotal(0);
          setHasMore(false);
        }
      })
      .finally(() => {
        if (requestVersion === requestVersionRef.current) setIsLoading(false);
      });
  }, [query, sortKey]);

  const loadMore = () => {
    const nextPage = page + 1;
    const params = new URLSearchParams({
      q: query,
      sort: sortKey,
      page: String(nextPage),
      limit: '24',
    });
    const requestVersion = ++requestVersionRef.current;
    setIsLoading(true);
    setError(null);
    api.get<{ success: boolean; videos: VideoItem[]; total: number; totalPages: number }>(
      `/api/search?${params.toString()}`
    )
      .then((res) => {
        if (!res.success || requestVersion !== requestVersionRef.current) return;
        setVideos((current) => [...current, ...(res.videos || [])]);
        setTotal(res.total || 0);
        setPage(nextPage);
        setHasMore(nextPage < (res.totalPages || 1));
      })
      .catch((err) => {
        if (requestVersion === requestVersionRef.current) {
          setError(err instanceof Error ? err.message : 'Search is temporarily unavailable.');
        }
      })
      .finally(() => {
        if (requestVersion === requestVersionRef.current) setIsLoading(false);
      });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      next.set('q', searchInput.trim());
    } else {
      next.delete('q');
    }
    setSearchParams(next);
  };

  const handleSortChange = (newSort: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('sort', newSort);
    setSearchParams(next);
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Header Form */}
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Search Catalog</h1>
        <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, creator, tags, or topics..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-inner"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-950/40 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Results Header with Count & Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          {query ? (
            <p className="text-sm text-slate-300">
              Found <strong className="text-white font-semibold">{total}</strong> {total === 1 ? 'video' : 'videos'} matching "
              <span className="text-rose-400">{query}</span>"
            </p>
          ) : (
            <p className="text-sm text-slate-300">
              Showing all <strong className="text-white font-semibold">{total}</strong> available catalog entries
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
          </span>
          <select
            value={sortKey}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium focus:outline-none focus:border-rose-500"
          >
            <option value="relevance">Most Relevant</option>
            <option value="popular">Most Viewed</option>
            <option value="latest">Latest Releases</option>
            <option value="duration">Longest Duration</option>
          </select>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-5 text-center">
          <p className="text-sm text-slate-300">{error}</p>
        </div>
      )}

      {/* Video Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-video bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 rounded-3xl bg-slate-900/30 border border-slate-800/80 p-8">
          <Search className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No results found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            We couldn't find any catalog matches for "{query}". Try checking your spelling or searching for broader terms like "cinema", "space", "documentary", or "4k".
          </p>
        </div>
      )}
      {videos.length > 0 && hasMore && (
        <div className="text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-sm font-semibold text-white hover:border-rose-500 disabled:opacity-60"
          >
            {isLoading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};
