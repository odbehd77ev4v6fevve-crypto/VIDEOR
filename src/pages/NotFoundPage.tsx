import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Compass, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-500 shadow-xl">
        <Film className="w-8 h-8" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-4xl font-extrabold text-white tracking-tight font-mono">404</h1>
        <h2 className="text-xl font-bold text-slate-200">Scene Not Found</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The frame or endpoint you navigated to does not exist or has been shifted in the catalog schedule.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Home
        </Link>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 transition-colors"
        >
          <Compass className="w-4 h-4" /> Explore Catalog
        </Link>
      </div>
    </div>
  );
};
