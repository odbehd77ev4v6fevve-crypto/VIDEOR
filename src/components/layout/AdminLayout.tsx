import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  PlusCircle,
  FolderTree,
  Sliders,
  Flag,
  Users,
  FileText,
  Settings,
  ArrowLeft,
  Film,
  LogOut,
  Database,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import { DotCircleLoader } from '../common/DotCircleLoader';

export const AdminLayout: React.FC = () => {
  const { user, isAdmin, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Route protection during session restoration
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07080c] flex items-center justify-center p-4">
        <DotCircleLoader
          size="lg"
          variant="amber"
          label="Authorizing Administrative Session..."
        />
      </div>
    );
  }

  // Route protection when unauthenticated or lacking administrative privileges
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Video className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
          <p className="text-sm text-slate-400">
            You must be signed in with verified staff credentials to access the VIDORA CMS.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/admin/login"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold transition-colors"
            >
              Staff Sign In
            </Link>
            <Link
              to="/"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Return to Site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Videos Catalog', path: '/admin/videos', icon: Video },
    { label: 'Add Video', path: '/admin/videos/new', icon: PlusCircle },
    { label: 'Categories', path: '/admin/categories', icon: FolderTree },
    { label: 'Homepage CMS', path: '/admin/homepage', icon: Sliders },
    { label: 'Moderation Queue', path: '/admin/reports', icon: Flag },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: FileText },
    { label: 'Platform Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#07080c] text-slate-100">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 lg:min-h-screen border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-[#0a0c12] flex flex-col shrink-0">
        {/* Brand */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5">
              <div className="w-full h-full bg-[#090a0f] rounded-[6px] flex items-center justify-center">
                <Film className="w-3.5 h-3.5 text-amber-500" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider font-mono text-white">VIDORA</span>
              <span className="ml-1.5 text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                CMS
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-row lg:flex-col flex-1 p-3 gap-1 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                  isActive
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Area */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Public Site
          </Link>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
              <p className="text-[10px] text-amber-400 font-mono uppercase tracking-wider">Super Administrator</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:overflow-y-auto">
        <header className="min-h-16 h-auto border-b border-slate-800/80 bg-[#090b10]/80 backdrop-blur px-4 sm:px-6 lg:px-8 py-3 sm:py-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
              Administrative Control Panel
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/videos/new"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-semibold shadow-md shadow-rose-950/40 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add YouTube Video
            </Link>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
