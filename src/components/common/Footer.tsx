import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Database, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';

export const Footer: React.FC = () => {
  const [dbType, setDbType] = useState<string>('MongoDB');
  const [isLive, setIsLive] = useState<boolean>(true);

  useEffect(() => {
    api.get('/api/health')
      .then((res) => {
        if (res.database?.type === 'atlas') {
          setDbType('MongoDB Atlas');
        } else if (res.database?.type === 'embedded') {
          setDbType('MongoDB Engine');
        } else {
          setDbType('MongoDB');
        }
        setIsLive(res.status === 'ok');
      })
      .catch(() => {
        setIsLive(false);
      });
  }, []);

  return (
    <footer className="border-t border-slate-800/80 bg-[#06070a] text-slate-400 text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Brand Column */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 to-amber-500 p-0.5">
                <div className="w-full h-full bg-[#090a0f] rounded-[6px] flex items-center justify-center">
                  <Film className="w-4 h-4 text-rose-500" />
                </div>
              </div>
              <span className="font-extrabold text-xl tracking-wider text-white font-mono">VIDORA</span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Curated high-fidelity YouTube video discovery platform. Experience breathtaking 4K masterworks, documentaries, technology breakdowns, and cinema shorts.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {isLive ? 'Systems Operational' : 'Degraded State'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 text-slate-300 border border-slate-800">
                <Database className="w-3 h-3 text-emerald-400" />
                {dbType}
              </span>
            </div>
          </div>

          {/* Discovery Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Discovery</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/explore" className="hover:text-white transition-colors">Explore All Videos</Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-white transition-colors">Browse Categories</Link>
              </li>
              <li>
                <Link to="/playlists" className="hover:text-white transition-colors">Curated Playlists</Link>
              </li>
              <li>
                <Link to="/search" className="hover:text-white transition-colors">Advanced Search</Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Legal & Information</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/about" className="hover:text-white transition-colors">About VIDORA</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">Contact & Support</Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* YouTube API Compliance Notice */}
        <div className="pt-8 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-2">
          <p className="leading-relaxed">
            VIDORA integrates with YouTube API Services and embeds video streams using the official YouTube IFrame Player API. VIDORA does not download, rehost, or manipulate video streams. All video assets, audio, trademarks, and channel copyrights remain the exclusive property of their respective creators on YouTube.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-slate-400">
            <p>© {new Date().getFullYear()} VIDORA Platform. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-300 flex items-center gap-1"
              >
                YouTube Terms of Service
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-300 flex items-center gap-1"
              >
                Google Privacy Policy
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
