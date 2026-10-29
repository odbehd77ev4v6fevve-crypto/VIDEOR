import React, { useEffect, useState } from 'react';
import { Settings, Database, Youtube, Save, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface PlatformSettingsData {
  siteName: string;
  tagline: string;
  allowRegistration: boolean;
  featuredNotice?: string;
  youtubeApiKeyConfigured: boolean;
}

interface DbStatus {
  connected: boolean;
  type: 'atlas' | 'embedded' | 'disconnected';
  host: string;
  database: string;
  readyState: number;
  uriRedacted: string;
}

export const AdminSettingsPage: React.FC = () => {
  const { showToast } = useToast();

  const [settings, setSettings] = useState<PlatformSettingsData | null>(null);
  const [database, setDatabase] = useState<DbStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form Fields
  const [siteName, setSiteName] = useState('');
  const [tagline, setTagline] = useState('');
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [featuredNotice, setFeaturedNotice] = useState('');

  useEffect(() => {
    api.get<{ success: boolean; settings: PlatformSettingsData; database: DbStatus }>('/api/admin/settings')
      .then((res) => {
        if (res.success) {
          setSettings(res.settings);
          setDatabase(res.database);
          setSiteName(res.settings.siteName || 'VIDORA');
          setTagline(res.settings.tagline || 'Premium Curated Video Discovery');
          setAllowRegistration(res.settings.allowRegistration ?? true);
          setFeaturedNotice(res.settings.featuredNotice || '');
        }
      })
      .catch((err) => console.warn('[AdminSettings] Fetch error:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put('/api/admin/settings', {
        siteName,
        tagline,
        allowRegistration,
        featuredNotice,
      });

      if (res.success) {
        showToast('Platform settings saved successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings.', 'error');
    } finally {
      setIsSaving(false);
    }
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
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-white tracking-tight">Platform Configuration & Status</h2>
        <p className="text-xs text-slate-400">
          Inspect MongoDB cluster persistence parameters, YouTube API quotas, and platform configurations.
        </p>
      </div>

      {/* Database Diagnostic Card */}
      {database && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Authoritative MongoDB Persistence
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Mongoose Ready State: {database.readyState === 1 ? '1 (Connected)' : database.readyState}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-sans">Database Engine Type</span>
              <span className="text-white font-bold uppercase">{database.type}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-sans">Database Name</span>
              <span className="text-emerald-400 font-bold">{database.database}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 sm:col-span-2">
              <span className="text-slate-500 block text-[10px] uppercase font-sans">Cluster Host / Endpoint</span>
              <span className="text-slate-300 break-all">{database.host}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            All catalog videos, user authentication accounts, Watch Later bookmarks, and watch history records are persisted directly to this MongoDB database instance.
          </p>
        </div>
      )}

      {/* YouTube Data API Integration Card */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Youtube className="w-4 h-4 text-rose-500" />
            YouTube Data API Integration Status
          </h3>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              settings?.youtubeApiKeyConfigured
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}
          >
            {settings?.youtubeApiKeyConfigured ? 'Direct API v3 Active' : 'Official oEmbed Mode'}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {settings?.youtubeApiKeyConfigured
            ? 'A custom YOUTUBE_API_KEY environment variable is configured. VIDORA queries the YouTube Data API v3 for exact durations, view counts, likes, and creator channel metadata.'
            : 'Running in official YouTube oEmbed protocol mode. VIDORA extracts verified video titles, creator channels, and high-resolution thumbnails without requiring Google Cloud API keys or consuming quotas.'}
        </p>
      </div>

      {/* Platform Branding Settings */}
      <form onSubmit={handleSave} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-500" />
          General Site Parameters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Site Name</label>
            <input
              type="text"
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Site Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Global Notification Banner (Optional)</label>
          <input
            type="text"
            value={featuredNotice}
            onChange={(e) => setFeaturedNotice(e.target.value)}
            placeholder="e.g. Welcome to VIDORA: Discover curated 4K open film productions."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-xs text-slate-200 font-semibold block">Allow Public Registration</span>
            <span className="text-[11px] text-slate-400">Allow visitors to register new member accounts</span>
          </div>
          <button
            type="button"
            onClick={() => setAllowRegistration(!allowRegistration)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              allowRegistration ? 'bg-rose-600 justify-end' : 'bg-slate-800 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-md" />
          </button>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
