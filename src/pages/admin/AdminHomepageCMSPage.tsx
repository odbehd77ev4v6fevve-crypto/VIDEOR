import React, { useEffect, useState } from 'react';
import { Sliders, Save, Film, Eye, EyeOff, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { VideoItem, CategoryItem } from '../../types';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface CMSSection {
  id: string;
  title: string;
  subtitle?: string;
  type: 'recent' | 'popular' | 'category' | 'collection' | 'custom';
  categorySlug?: string;
  limit: number;
  isVisible: boolean;
  order: number;
}

interface CMSConfig {
  heroVideoId?: string;
  heroCustomTitle?: string;
  heroCustomSubtitle?: string;
  heroCustomBadge?: string;
  sections: CMSSection[];
}

export const AdminHomepageCMSPage: React.FC = () => {
  const { showToast } = useToast();

  const [heroVideoId, setHeroVideoId] = useState<string>('');
  const [heroCustomTitle, setHeroCustomTitle] = useState<string>('');
  const [heroCustomSubtitle, setHeroCustomSubtitle] = useState<string>('');
  const [heroCustomBadge, setHeroCustomBadge] = useState<string>('FEATURED DISCOVERY');
  const [sections, setSections] = useState<CMSSection[]>([]);

  const [availableVideos, setAvailableVideos] = useState<VideoItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([
      api.get<{ success: boolean; config: any }>('/api/admin/homepage'),
      api.get<{ success: boolean; videos: VideoItem[] }>('/api/admin/videos?limit=50&status=published'),
      api.get<{ success: boolean; categories: CategoryItem[] }>('/api/admin/categories'),
    ])
      .then(([cmsRes, videosRes, catRes]) => {
        if (cmsRes.success && cmsRes.config) {
          const cfg = cmsRes.config;
          setHeroVideoId(cfg.heroVideoId?._id || cfg.heroVideoId || '');
          setHeroCustomTitle(cfg.heroCustomTitle || '');
          setHeroCustomSubtitle(cfg.heroCustomSubtitle || '');
          setHeroCustomBadge(cfg.heroCustomBadge || 'FEATURED DISCOVERY');
          setSections(cfg.sections || []);
        }
        if (videosRes.success) setAvailableVideos(videosRes.videos || []);
        if (catRes.success) setCategories(catRes.categories || []);
      })
      .catch((err) => console.warn('[AdminHomepageCMS] Fetch error:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put('/api/admin/homepage', {
        heroVideoId: heroVideoId || null,
        heroCustomTitle,
        heroCustomSubtitle,
        heroCustomBadge,
        sections,
      });

      if (res.success) {
        showToast('Homepage CMS configuration updated and persisted!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save CMS configuration.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSection = () => {
    const newSec: CMSSection = {
      id: `sec-${Date.now()}`,
      title: 'New Curated Section',
      subtitle: 'Hand-picked showcase',
      type: 'recent',
      limit: 8,
      isVisible: true,
      order: sections.length,
    };
    setSections([...sections, newSec]);
  };

  const handleRemoveSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const handleToggleVisible = (index: number) => {
    setSections(
      sections.map((s, i) => (i === index ? { ...s, isVisible: !s.isVisible } : s))
    );
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const copy = [...sections];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    // reindex order
    copy.forEach((s, i) => (s.order = i));
    setSections(copy);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="h-8 w-48 bg-slate-900 rounded animate-pulse" />
        <div className="h-96 rounded-3xl bg-slate-900 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Homepage CMS Studio</h2>
          <p className="text-xs text-slate-400">
            Control the featured hero centerpiece, section ordering, category rails, and discovery rows.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving Changes...' : 'Save CMS Configuration'}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Hero Featured Stream */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
          <div className="pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Film className="w-4 h-4 text-rose-500" />
              1. Hero Centerpiece Stream
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select the primary video featured at the top of the homepage along with optional headline overrides.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Target Video</label>
              <select
                value={heroVideoId}
                onChange={(e) => setHeroVideoId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">Auto-select latest featured video</option>
                {availableVideos.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.displayTitle} ({v.channelTitle})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Badge Label</label>
                <input
                  type="text"
                  value={heroCustomBadge}
                  onChange={(e) => setHeroCustomBadge(e.target.value)}
                  placeholder="e.g. EDITOR’S CHOICE"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Custom Headline (Optional)</label>
                <input
                  type="text"
                  value={heroCustomTitle}
                  onChange={(e) => setHeroCustomTitle(e.target.value)}
                  placeholder="Defaults to video title if left blank"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Custom Subtitle (Optional)</label>
              <textarea
                rows={2}
                value={heroCustomSubtitle}
                onChange={(e) => setHeroCustomSubtitle(e.target.value)}
                placeholder="Defaults to video description if left blank"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Discovery Rails & Sections */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-500" />
                2. Discovery Section Rows
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize titles, content sources, display limits, and ordering for public discovery rows.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddSection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Section Row
            </button>
          </div>

          <div className="space-y-3">
            {sections.map((sec, idx) => (
              <div
                key={sec.id || idx}
                className={`p-4 rounded-2xl border transition-all ${
                  sec.isVisible
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-950/40 border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">#{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleVisible(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white"
                      title={sec.isVisible ? 'Visible (click to hide)' : 'Hidden (click to show)'}
                    >
                      {sec.isVisible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-600" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Section Title</label>
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => {
                          const copy = [...sections];
                          copy[idx].title = e.target.value;
                          setSections(copy);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Content Source</label>
                      <select
                        value={sec.type}
                        onChange={(e) => {
                          const copy = [...sections];
                          copy[idx].type = e.target.value as any;
                          setSections(copy);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                      >
                        <option value="popular">Most Popular</option>
                        <option value="recent">Recently Added</option>
                        <option value="category">Category Rail</option>
                      </select>
                    </div>

                    {sec.type === 'category' ? (
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Target Category</label>
                        <select
                          value={sec.categorySlug || ''}
                          onChange={(e) => {
                            const copy = [...sections];
                            copy[idx].categorySlug = e.target.value;
                            setSections(copy);
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                        >
                          <option value="">Select Category</option>
                          {categories.map((c) => (
                            <option key={c.slug} value={c.slug}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Item Limit</label>
                        <input
                          type="number"
                          min={4}
                          max={24}
                          value={sec.limit || 8}
                          onChange={(e) => {
                            const copy = [...sections];
                            copy[idx].limit = parseInt(e.target.value, 10) || 8;
                            setSections(copy);
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* Ordering & Delete */}
                  <div className="flex items-center gap-1 shrink-0 self-center">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sections.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(idx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};
