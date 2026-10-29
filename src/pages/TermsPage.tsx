import React from 'react';

export const TermsPage: React.FC = () => {
  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Terms of Service</h1>
        <p className="text-xs text-slate-400">Effective Date: October 2026</p>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-300 text-sm space-y-6 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">1. Platform Nature</h2>
          <p className="text-xs text-slate-400">
            VIDORA is a discovery and curation index for authorized YouTube videos. VIDORA does not download, transcode, or rehost video or audio files. All content playback occurs through legitimate YouTube embedded player frames.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">2. YouTube Terms Agreement</h2>
          <p className="text-xs text-slate-400">
            By using VIDORA, users also acknowledge and agree to be bound by the YouTube Terms of Service (<a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer" className="text-rose-400 underline">https://www.youtube.com/t/terms</a>).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">3. Content Ownership & Copyright</h2>
          <p className="text-xs text-slate-400">
            All videos, audio, trademarks, channel titles, and thumbnails belong to their respective copyright holders on YouTube. If you are a copyright owner and prefer your YouTube video not to be indexed within VIDORA, you can disable website embedding in your YouTube Studio or submit a removal report.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">4. Prohibited Behavior</h2>
          <p className="text-xs text-slate-400">
            Users agree not to attempt brute-force access, bypass authentication boundaries, submit spam reports, or disrupt platform infrastructure.
          </p>
        </section>
      </div>
    </div>
  );
};
