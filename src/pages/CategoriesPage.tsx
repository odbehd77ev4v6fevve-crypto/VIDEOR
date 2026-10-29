import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Film, Cpu, Rocket, Globe, Music, Compass, ChevronRight, Video } from 'lucide-react';
import { CategoryItem } from '../types';
import { api } from '../lib/api';

const iconMap: Record<string, React.ElementType> = {
  Film,
  Cpu,
  Rocket,
  Globe,
  Music,
  Compass,
};

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    api.get<{ success: boolean; categories: CategoryItem[] }>('/api/categories')
      .then((res) => {
        if (res.success && res.categories?.length > 0) {
          setCategories(res.categories);
        }
      })
      .catch((err) => console.warn('[CategoriesPage] Fetch categories:', err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20">
          <Layers className="w-3.5 h-3.5" />
          Browse by Topic
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Category Directory</h1>
        <p className="text-sm text-slate-400">
          Explore specialized collections curated by subject, technical discipline, and visual style.
        </p>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-900 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon || 'Film'] || Film;
            return (
              <Link
                key={cat.slug}
                to={`/categories/${cat.slug}`}
                className="group relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-black/50 hover:-translate-y-1"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-400 px-2.5 py-1 rounded-lg bg-slate-800/60 flex items-center gap-1.5">
                      <Video className="w-3 h-3 text-rose-400" />
                      {cat.videoCount} {cat.videoCount === 1 ? 'Video' : 'Videos'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-rose-400 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-rose-400 group-hover:translate-x-1 transition-transform">
                  <span>Explore Collection</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
