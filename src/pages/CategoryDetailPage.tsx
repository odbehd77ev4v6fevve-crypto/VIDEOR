import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layers, ArrowLeft, Video, Film, Cpu, Rocket, Globe, Music, Compass } from 'lucide-react';
import { CategoryItem, VideoItem } from '../types';
import { VideoCard } from '../components/common/VideoCard';
import { api } from '../lib/api';

const iconMap: Record<string, React.ElementType> = {
  Film,
  Cpu,
  Rocket,
  Globe,
  Music,
  Compass,
};

export const CategoryDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [category, setCategory] = useState<CategoryItem | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);

    api.get<{ success: boolean; category: CategoryItem; videos: VideoItem[]; total: number }>(
      `/api/categories/${slug}`
    )
      .then((res) => {
        if (res.success) {
          setCategory(res.category);
          setVideos(res.videos || []);
          setTotal(res.total || 0);
        }
      })
      .catch((err) => {
        setError(err.message || 'Category not found.');
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="h-36 rounded-3xl bg-slate-900 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-video bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Category Not Found</h2>
        <p className="text-sm text-slate-400">{error || 'The requested category does not exist.'}</p>
        <Link
          to="/categories"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Categories Directory
        </Link>
      </div>
    );
  }

  const Icon = iconMap[category.icon || 'Film'] || Film;

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Category Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <Link
            to="/categories"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Categories
          </Link>
          <span className="text-xs font-mono text-rose-400 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 font-bold">
            {total} {total === 1 ? 'Curated Video' : 'Curated Videos'}
          </span>
        </div>

        <div className="flex items-start gap-4 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-950/50">
            <Icon className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-3xl">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {category.name}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {category.description}
            </p>
          </div>
        </div>
      </div>

      {/* Videos in this Category */}
      {videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-3 rounded-2xl bg-slate-900/30 border border-slate-800/80 p-8">
          <Video className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No videos in this category yet</h3>
          <p className="text-xs text-slate-400">
            Our curators have not added any videos to this category. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
};
