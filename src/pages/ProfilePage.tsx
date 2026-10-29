import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Bookmark, Clock, ListVideo, KeyRound, Save, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, isLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
      return;
    }
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setAutoplayNext(user.preferences?.autoplayNext ?? true);
    }
  }, [user, isLoading, navigate]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfile({
        displayName,
        bio,
        preferences: {
          theme: 'dark',
          autoplayNext,
          defaultQuality: 'auto',
        },
      });
      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await api.put('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      if (res.success) {
        showToast('Password changed successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to change password.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-8">
        <div className="h-28 rounded-3xl bg-slate-900 animate-pulse" />
        <div className="h-64 rounded-3xl bg-slate-900 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Profile Header & Stats */}
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl shrink-0">
            {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">{user.displayName}</h1>
                <p className="text-xs text-slate-400 font-mono">{user.email}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 self-center sm:self-auto">
                <Shield className="w-3.5 h-3.5" />
                {user.role === 'admin' ? 'Super Administrator' : 'Platform Member'}
              </span>
            </div>
            {user.bio && <p className="text-xs text-slate-300 pt-2 leading-relaxed">{user.bio}</p>}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
            <Clock className="w-5 h-5 text-rose-500 mx-auto mb-1" />
            <span className="block text-xl font-bold font-mono text-white">{user.stats?.historyCount || 0}</span>
            <span className="text-[11px] text-slate-400">Watched</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
            <Bookmark className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <span className="block text-xl font-bold font-mono text-white">{user.stats?.watchLaterCount || 0}</span>
            <span className="text-[11px] text-slate-400">Watch Later</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
            <ListVideo className="w-5 h-5 text-sky-500 mx-auto mb-1" />
            <span className="block text-xl font-bold font-mono text-white">{user.stats?.playlistsCount || 0}</span>
            <span className="text-[11px] text-slate-400">Playlists</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <User className="w-4 h-4 text-rose-500" />
            Profile Preferences
          </h2>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a short bio or film interests..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-300 font-medium">Autoplay Next Video</span>
              <button
                type="button"
                onClick={() => setAutoplayNext(!autoplayNext)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  autoplayNext ? 'bg-rose-600 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-950/40 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-500" />
            Security & Password
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">New Password (min 8 chars)</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
              >
                <KeyRound className="w-4 h-4" />
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
