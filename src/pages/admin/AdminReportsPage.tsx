import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag, CheckCircle, XCircle, ShieldAlert, Video, MessageSquare } from 'lucide-react';
import { ReportItem } from '../../types';
import { DotCircleLoader } from '../../components/common/DotCircleLoader';
import { api } from '../../lib/api';
import { SafeImage } from '../../components/common/SafeImage';
import { getVideoThumbnailSources } from '../../lib/media';
import { useToast } from '../../context/ToastContext';

export const AdminReportsPage: React.FC = () => {
  const { showToast } = useToast();

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const fetchReports = () => {
    setIsLoading(true);
    api.get<{ success: boolean; reports: ReportItem[] }>(`/api/admin/reports?status=${statusFilter}`)
      .then((res) => {
        if (res.success) setReports(res.reports || []);
      })
      .catch((err) => console.warn('[AdminReports] Fetch error:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const handleUpdateStatus = async (
    reportId: string,
    newStatus: 'reviewed' | 'resolved' | 'dismissed',
    unpublish = false
  ) => {
    setIsUpdating(true);
    try {
      const res = await api.put(`/api/admin/reports/${reportId}`, {
        status: newStatus,
        adminNotes,
        unpublishVideo: unpublish,
      });

      if (res.success) {
        showToast(
          unpublish
            ? 'Report resolved and offending video was unpublished.'
            : `Report status updated to ${newStatus}.`,
          'success'
        );
        fetchReports();
        setSelectedReport(null);
        setAdminNotes('');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update report.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Content Moderation Queue</h2>
          <p className="text-xs text-slate-400">
            Review user flags, broken streams, copyright claims, and moderation reports.
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          {['all', 'pending', 'reviewed', 'resolved', 'dismissed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-rose-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <DotCircleLoader size="md" variant="rose" label="Loading moderation queue..." />
          </div>
        ) : reports.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {reports.map((report) => (
              <div key={report._id} className="p-6 space-y-4 hover:bg-slate-800/20 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Reason: {report.reason}
                    </span>
                    <span className="text-xs text-slate-400">
                      Reported {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider self-start sm:self-auto ${
                      report.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : report.status === 'resolved'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {report.videoId && (
                    <SafeImage
                      src={getVideoThumbnailSources(report.videoId)[0]}
                      fallbackSrcs={getVideoThumbnailSources(report.videoId).slice(1)}
                      alt={report.videoTitle}
                      className="w-40 aspect-video rounded-xl object-cover bg-slate-950 shrink-0"
                    />
                  )}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white">
                      Target: {report.videoId?.displayTitle || report.videoTitle}
                    </h4>
                    <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 leading-relaxed">
                      "{report.details || 'No additional explanation provided.'}"
                    </p>
                    {report.reporterEmail && (
                      <p className="text-[11px] text-slate-500 font-mono">
                        Reporter: {report.reporterEmail}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/watch/${report.youtubeVideoId}`}
                      target="_blank"
                      className="text-xs font-semibold text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <Video className="w-3.5 h-3.5" /> Inspect Video Stream
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateStatus(report._id, 'dismissed')}
                      disabled={isUpdating}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(report._id, 'resolved')}
                      disabled={isUpdating}
                      className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs font-semibold"
                    >
                      Mark Resolved
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(report._id, 'resolved', true)}
                      disabled={isUpdating}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow"
                    >
                      Unpublish Video & Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            No reports in the "{statusFilter}" queue.
          </div>
        )}
      </div>
    </div>
  );
};
