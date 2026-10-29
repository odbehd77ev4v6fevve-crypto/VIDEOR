import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Film,
  Search,
  Compass,
  Bookmark,
  Clock,
  ListVideo,
  ShieldCheck,
  User,
  LogOut,
  Menu,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { getInitials } from '../../lib/user';
import { AuthModal, type AuthModalMode } from './AuthModal';
import { SafeImage } from './SafeImage';

interface AutocompleteItem {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  category: string;
  thumbnail: string;
  duration: string;
}

export const Navbar: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const autocompleteRequestRef = useRef(0);

  // Debounced search autocomplete
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      autocompleteRequestRef.current += 1;
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const requestVersion = ++autocompleteRequestRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<{ success: boolean; suggestions: AutocompleteItem[] }>(
          `/api/search/autocomplete?q=${encodeURIComponent(searchQuery.trim())}`
        );
        if (res.success && requestVersion === autocompleteRequestRef.current) {
          setSuggestions(res.suggestions || []);
          setShowDropdown(res.suggestions.length > 0);
          setSelectedIndex(-1);
        }
      } catch (e) {
        if (requestVersion === autocompleteRequestRef.current) setSuggestions([]);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowDropdown(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      navigate(`/watch/${suggestions[selectedIndex].videoId}`);
    } else if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const navLinks = [
    { label: 'Explore', path: '/explore', icon: Compass },
    { label: 'Categories', path: '/categories', icon: Layers },
    { label: 'Playlists', path: '/playlists', icon: ListVideo },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090a0f]/90 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-6 shrink-0">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 p-0.5 shadow-lg shadow-rose-950/40 group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full bg-[#090a0f] rounded-[10px] flex items-center justify-center">
                <Film className="w-4 h-4 text-rose-500 group-hover:rotate-6 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-wider text-white font-mono flex items-center gap-1.5">
                VIDORA
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  4K
                </span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-rose-500/10 text-rose-400 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Global Autocomplete Search Bar */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-md hidden sm:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search films, creators, topics..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-900/90 border border-slate-700/60 text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:border-rose-500/80 focus:ring-1 focus:ring-rose-500/50 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </form>

          {/* Autocomplete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute top-full mt-2 left-0 right-0 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
              <div className="p-1.5 divide-y divide-slate-800">
                {suggestions.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      navigate(`/watch/${item.videoId}`);
                      setShowDropdown(false);
                    }}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedIndex === idx ? 'bg-rose-950/40 text-white' : 'hover:bg-slate-800/60 text-slate-200'
                    }`}
                  >
                    <SafeImage
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-14 h-8 object-cover rounded shrink-0 bg-slate-800"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate text-slate-100">{item.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">{item.channel}</p>
                    </div>
                    {item.duration && (
                      <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                        {item.duration}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div
                onClick={handleSearchSubmit}
                className="px-3 py-2 bg-slate-950/80 text-[11px] text-center text-rose-400 font-medium cursor-pointer hover:bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-1"
              >
                <Search className="w-3 h-3" />
                Press Enter to view all results for "{searchQuery}"
              </div>
            </div>
          )}
        </div>

        {/* Right Nav Action Area */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Profile Menu Dropdown */}
              <div ref={profileMenuRef} className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  aria-label="User profile menu"
                  aria-expanded={isProfileOpen}
                  aria-haspopup="menu"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-xs font-bold text-white shadow">
                    {getInitials(user.displayName)}
                  </div>
                </button>

                {isProfileOpen && (
                  <div
                    role="menu"
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        setIsProfileOpen(false);
                        profileMenuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
                      }
                    }}
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1.5 z-50 text-sm animate-in fade-in slide-in-from-top-1"
                  >
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="font-semibold text-white truncate">{user.displayName}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {user.role}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        My Profile & Settings
                      </Link>
                      <Link
                        to="/watch-later"
                        className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60"
                      >
                        <Bookmark className="w-4 h-4 text-slate-400" />
                        Watch Later
                      </Link>
                      <Link
                        to="/history"
                        className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60"
                      >
                        <Clock className="w-4 h-4 text-slate-400" />
                        Watch History
                      </Link>
                      <Link
                        to="/my-playlists"
                        className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60"
                      >
                        <ListVideo className="w-4 h-4 text-slate-400" />
                        My Playlists
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-amber-400 hover:bg-amber-500/10 font-medium"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Admin Dashboard
                        </Link>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-800">
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-rose-400 hover:bg-rose-500/10 text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuthModalMode('login')}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthModalMode('register')}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-md shadow-rose-950/50 transition-all"
              >
                Join Free
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {authModalMode && (
        <AuthModal isOpen={true} mode={authModalMode} onClose={() => setAuthModalMode(null)} />
      )}

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#090a0f] px-4 pt-3 pb-6 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative sm:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white"
            />
          </form>

          <div className="grid grid-cols-2 gap-2 pt-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/60 text-slate-200 hover:bg-slate-800 text-sm font-medium"
                >
                  <Icon className="w-4 h-4 text-rose-500" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold"
            >
              <ShieldCheck className="w-4 h-4" />
              Open Administrator CMS
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
