import React, { useEffect, useState } from 'react';
import { FileText, Clock, User, Shield } from 'lucide-react';
import { AuditLogItem } from '../../types';
import { DotCircleLoader } from '../../components/common/DotCircleLoader';
import { api } from '../../lib/api';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    api.get<{ success: boolean; logs: AuditLogItem[] }>('/api/admin/audit-logs')
      .then((res) => {
        if (res.success) setLogs(res.logs || []);
      })
      .catch((err) => console.warn('[AdminAuditLogs] Fetch logs:', err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-white tracking-tight">Security & Moderation Audit Trail</h2>
        <p className="text-xs text-slate-400">
          Immutable server-side record of administrative actions, video modifications, and moderation decisions.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
            <tr>
              <th className="p-4">Action</th>
              <th className="p-4">Actor</th>
              <th className="p-4">Target</th>
              <th className="p-4">Timestamp</th>
              <th className="p-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 font-sans">
                  <DotCircleLoader size="md" variant="amber" label="Retrieving audit records..." />
                </td>
              </tr>
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-bold text-rose-400">{log.action}</td>
                  <td className="p-4 text-slate-300">{log.actorEmail}</td>
                  <td className="p-4 text-slate-400">{log.targetType}</td>
                  <td className="p-4 text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 text-slate-400 font-mono text-[10px] max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 font-sans">
                  No recorded audit activities yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
