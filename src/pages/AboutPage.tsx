import React from 'react';
import { Film, Sparkles, Shield, Cpu, Play, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20">
          <Film className="w-3.5 h-3.5" />
          The VIDORA Standard
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
          Cinematic Discovery for High-Fidelity Video
        </h1>
        <p className="text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          VIDORA was created to solve video discovery fatigue. Instead of endless algorithmic clutter, VIDORA curates exceptional 4K short films, scientific breakthroughs, architectural tours, and independent creative masterworks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Hand-Curated Catalog</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every video is evaluated for visual excellence, storytelling depth, and technical craft before publication into the catalog.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Full Creator Attribution</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            All videos stream via official YouTube embedded players. Channel owners retain 100% of their views, monetization, and copyright rights.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Persistent Cinema Tools</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Track exact playback progress across devices, bookmark items for Watch Later, and construct custom collections.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Ready to begin your journey?</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Start exploring hundreds of high-resolution masterworks curated across science, cinema, and nature.
        </p>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50"
        >
          <Play className="w-4 h-4 fill-current" />
          Explore the Catalog
        </Link>
      </div>
    </div>
  );
};
