import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Flag, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { VideoItem } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ReportVideoPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [video, setVideo] = useState<VideoItem | null>(null);
  const [reason, setReason] = useState('broken');
  const [details, setDetails] = useState('');
  const [reporterEmail, setReporterEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!videoId) return;
    api.get<{ success: boolean; video: VideoItem }>(`/api/videos/${videoId}`)
      .then((res) => {
        if (res.success) setVideo(res.video);
      })
      .catch(() => {});
  }, [videoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/api/reports', {
        videoId: video._id,
        youtubeVideoId: video.youtubeVideoId,
        reason,
        details,
        reporterEmail,
      });

      if (res.success) {
        setIsSubmitted(true);
        showToast('Report submitted for moderation review.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit report.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <Link
        to={video ? `/watch/${video.youtubeVideoId}` : '/explore'}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Video
      </Link>

      <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-2xl space-y-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20">
            <Flag className="w-3.5 h-3.5" /> Moderation Request
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Report Video Issue</h1>
          {video && (
            <p className="text-xs text-slate-300 font-medium truncate pt-1">
              Target: <span className="text-rose-400">{video.displayTitle}</span>
            </p>
          )}
        </div>

        {isSubmitted ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Report Logged</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Our moderation team reviews reported entries to ensure broken or inappropriate videos are promptly handled.
            </p>
            <button
              onClick={() => navigate(video ? `/watch/${video.youtubeVideoId}` : '/explore')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Return to Catalog
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Category of Concern</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="broken">Broken stream or unavailable on YouTube</option>
                <option value="inappropriate">Inappropriate or offensive content</option>
                <option value="copyright">Copyright or trademark issue</option>
                <option value="misleading">Misleading title or description</option>
                <option value="other">Other issue</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Your Email (Optional, for updates)</label>
              <input
                type="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Detailed Explanation</label>
              <textarea
                rows={4}
                required
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe what occurred or why this video requires review..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
              {isSubmitting ? 'Submitting Report...' : 'Submit Report for Moderation'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
