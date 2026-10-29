import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Video,
  PlusCircle,
  FolderTree,
  Sliders,
  Flag,
  Users,
  Database,
  Activity,
  ArrowRight,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { api } from '../../lib/api';

interface DashboardStats {
  videos: {
    total: number;
    published: number;
    draft: number;
    archived: number;
  };
  categories: number;
  users: number;
  reports: {
    pending: number;
  };
  database: {
    connected: boolean;
    type: 'atlas' | 'embedded' | 'disconnected';
    host: string;
    database: string;
    readyState: number;
    uriRedacted: string;
  };
  recentActivity: Array<{
    _id: string;
    actorEmail: string;
    action: string;
    targetType: string;
    createdAt: string;
  }>;
}

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    api.get<{ success: boolean; stats: DashboardStats }>('/api/admin/stats')
      .then((res) => {
        if (res.success) setStats(res.stats);
      })
      .catch((err) => console.warn('[AdminDashboard] Stats fetch:', err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="space-y-8 animate-pulse motion-reduce:animate-none">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-900 rounded-xl" />
          <div className="h-3 w-80 bg-slate-900 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900 border border-slate-800/80 p-5 space-y-3" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-white tracking-tight">Overview Dashboard</h2>
        <p className="text-xs text-slate-400">
          Real-time catalog metrics, MongoDB Atlas status, and administrative activity.
        </p>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Videos */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Catalog Videos</span>
            <Video className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-white">{stats.videos.total}</p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
            <span className="text-emerald-400 font-semibold">{stats.videos.published} Published</span>
            <span>•</span>
            <span className="text-amber-400">{stats.videos.draft} Drafts</span>
          </div>
        </div>

        {/* Categories */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Categories</span>
            <FolderTree className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-white">{stats.categories}</p>
          <p className="text-[11px] text-slate-400 pt-1">Organized taxonomy directory</p>
        </div>

        {/* Users */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Registered Users</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-white">{stats.users}</p>
          <p className="text-[11px] text-slate-400 pt-1">Platform user accounts</p>
        </div>

        {/* Pending Reports */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Pending Reports</span>
            <Flag className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-white">{stats.reports.pending}</p>
          <div className="flex items-center gap-1.5 text-[11px] pt-1">
            {stats.reports.pending > 0 ? (
              <span className="text-amber-400 font-semibold">Requires moderation</span>
            ) : (
              <span className="text-emerald-400">Queue is clear</span>
            )}
          </div>
        </div>
      </div>

      {/* Database Status Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">MongoDB Persistence Engine</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {stats.database.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deployment Mode: <strong className="text-white uppercase">{stats.database.type}</strong> • Database:{' '}
              <span className="text-emerald-400 font-mono">{stats.database.database}</span> • Host: <span className="text-slate-300 font-mono text-[11px]">{stats.database.host}</span>
            </p>
          </div>
        </div>

        <Link
          to="/admin/settings"
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shrink-0"
        >
          View Connection Diagnostic
        </Link>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Content Management Workflows
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/admin/videos/new"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-4 h-4 text-rose-500" />
                Add YouTube Video
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/admin/videos"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Video className="w-4 h-4 text-sky-500" />
                Manage Videos Catalog
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/admin/categories"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <FolderTree className="w-4 h-4 text-amber-500" />
                Manage Categories
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/admin/homepage"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-indigo-500" />
                Configure Homepage CMS
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Recent Audit Log
            </h3>
            <Link to="/admin/audit-logs" className="text-xs text-rose-400 hover:underline">
              View All Logs
            </Link>
          </div>

          <div className="space-y-2">
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.slice(0, 5).map((log) => (
                <div
                  key={log._id}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="font-mono text-slate-200 font-semibold truncate">{log.action}</span>
                    <span className="text-slate-500 truncate">({log.targetType})</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-4">No recorded audit logs yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
