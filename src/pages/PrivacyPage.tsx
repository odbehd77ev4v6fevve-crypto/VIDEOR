import React from 'react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
        <p className="text-xs text-slate-400">Effective Date: October 2026</p>
      </div>

      <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-300 text-sm space-y-6 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">1. Information We Collect</h2>
          <p className="text-xs text-slate-400">
            VIDORA collects minimal information required to manage user accounts and provide persistence. This includes your registered email, display name, hashed passwords (which are never stored in plaintext), watch history timestamps, bookmarked Watch Later entries, and user-created playlist records.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">2. YouTube Embedded Services & Google APIs</h2>
          <p className="text-xs text-slate-400">
            VIDORA uses the official YouTube IFrame Player API and YouTube Data API v3 to retrieve video metadata and enable video streaming. When playing embedded videos, user interaction with the embedded player is governed by the Google Privacy Policy (<a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-rose-400 underline">https://policies.google.com/privacy</a>) and YouTube Terms of Service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">3. Data Ownership & Storage</h2>
          <p className="text-xs text-slate-400">
            All user account records, history checkpoints, and saved lists are securely stored in persistent MongoDB database clusters. We do not sell, rent, or share personal user data with third-party advertising networks.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">4. User Rights & Account Deletion</h2>
          <p className="text-xs text-slate-400">
            Users may clear their watch history at any time directly through the platform interface. If you wish to delete your account and associated data completely, please submit a request to support@vidora.tv.
          </p>
        </section>
      </div>
    </div>
  );
};
