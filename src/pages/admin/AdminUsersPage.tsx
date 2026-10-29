import React, { useEffect, useState } from 'react';
import { Users, Shield, ShieldAlert, UserCheck, UserX, Clock } from 'lucide-react';
import { UserProfile } from '../../types';
import { DotCircleLoader } from '../../components/common/DotCircleLoader';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export const AdminUsersPage: React.FC = () => {
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUsers = () => {
    setIsLoading(true);
    api.get<{ success: boolean; users: UserProfile[]; total: number }>('/api/admin/users')
      .then((res) => {
        if (res.success) {
          setUsers(res.users || []);
          setTotal(res.total || 0);
        }
      })
      .catch((err) => console.warn('[AdminUsers] Fetch error:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await api.put(`/api/admin/users/${user._id}/status`, { status: newStatus });
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, status: newStatus } : u))
        );
        showToast(`User marked as ${newStatus}.`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status.', 'error');
    }
  };

  const handleToggleRole = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      const res = await api.put(`/api/admin/users/${user._id}/status`, { role: newRole });
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, role: newRole } : u))
        );
        showToast(`User role updated to ${newRole}.`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to change role.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-white tracking-tight">User Account Directory</h2>
        <p className="text-xs text-slate-400">
          Manage member accounts, administrative privileges, and authorization states.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Registered Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  <DotCircleLoader size="md" variant="amber" label="Loading user accounts..." />
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-200">
                        {u.displayName ? u.displayName[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{u.displayName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>

                  <td className="p-4 text-slate-400 font-mono text-[11px]">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleRole(u)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                      >
                        {u.role === 'admin' ? 'Demote to User' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                          u.status === 'active'
                            ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800'
                            : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No registered users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
