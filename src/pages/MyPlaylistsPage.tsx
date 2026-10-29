import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ListVideo, Plus, Trash2, Globe, Lock, EyeOff, Play, Film } from 'lucide-react';
import { PlaylistData } from '../types';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { api } from '../lib/api';
import { SafeImage } from '../components/common/SafeImage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const MyPlaylistsPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState<PlaylistData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Create playlist modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Delete modal
  const [playlistToDelete, setPlaylistToDelete] = useState<PlaylistData | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchPlaylists = () => {
    setIsLoading(true);
    api.get<{ success: boolean; playlists: PlaylistData[] }>('/api/playlists/mine')
      .then((res) => {
        if (res.success) setPlaylists(res.playlists || []);
      })
      .catch((err) => console.warn('[MyPlaylistsPage] Fetch error:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isAuthLoading && !user) {
      showToast('Please sign in to view your playlists.', 'info');
      navigate('/login');
      return;
    }
    if (user) {
      fetchPlaylists();
    }
  }, [user, isAuthLoading, navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; playlist: PlaylistData }>('/api/playlists', {
        title: title.trim(),
        description: description.trim(),
        visibility,
      });

      if (res.success) {
        showToast('Playlist created successfully!', 'success');
        setPlaylists((prev) => [res.playlist, ...prev]);
        setIsCreateOpen(false);
        setTitle('');
        setDescription('');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create playlist.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!playlistToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/api/playlists/${playlistToDelete._id}`);
      if (res.success) {
        setPlaylists((prev) => prev.filter((p) => p._id !== playlistToDelete._id));
        showToast('Playlist deleted.', 'success');
        setPlaylistToDelete(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete playlist.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-10 w-48 bg-slate-900 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20">
            <ListVideo className="w-3.5 h-3.5" />
            Custom Compilations
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Playlists</h1>
          <p className="text-xs text-slate-400">
            Organize and arrange your favorite videos into custom watch queues.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-semibold shadow-lg shadow-rose-950/40 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Playlist
        </button>
      </div>

      {/* Grid */}
      {playlists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {playlists.map((playlist) => (
            <div
              key={playlist._id}
              className="group relative flex flex-col rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/50 hover:-translate-y-1"
            >
              {/* Cover Banner */}
              <Link
                to={`/playlists/${playlist._id}`}
                className="relative aspect-[16/9] w-full bg-slate-950 overflow-hidden block"
              >
                {playlist.coverUrl ? (
                  <SafeImage
                    src={playlist.coverUrl}
                    alt={playlist.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                    <Film className="w-10 h-10" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                {/* Visibility Badge */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-slate-300 border border-white/10">
                    {playlist.visibility === 'public' && <Globe className="w-3 h-3 text-emerald-400" />}
                    {playlist.visibility === 'unlisted' && <EyeOff className="w-3 h-3 text-amber-400" />}
                    {playlist.visibility === 'private' && <Lock className="w-3 h-3 text-slate-400" />}
                    {playlist.visibility}
                  </span>
                </div>

                {/* Video Count Badge */}
                <div className="absolute bottom-2.5 right-2.5 z-10">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-black/80 text-white backdrop-blur-md">
                    {playlist.videoCount || 0} Videos
                  </span>
                </div>
              </Link>

              {/* Info */}
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <Link
                    to={`/playlists/${playlist._id}`}
                    className="text-base font-bold text-white hover:text-rose-400 transition-colors line-clamp-1"
                  >
                    {playlist.title}
                  </Link>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {playlist.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <Link
                    to={`/playlists/${playlist._id}`}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Open Playlist
                  </Link>
                  <button
                    onClick={() => setPlaylistToDelete(playlist)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete playlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 rounded-3xl bg-slate-900/30 border border-slate-800/80 p-8">
          <ListVideo className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No playlists yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create your first custom playlist to group films by theme, director, or viewing session.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Playlist
          </button>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Playlist">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Playlist Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Cinematic Masterpieces 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="What makes this playlist special..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Privacy Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="public">Public (Visible in discovery directory)</option>
              <option value="unlisted">Unlisted (Accessible only via direct URL)</option>
              <option value="private">Private (Only visible to you)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Playlist'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(playlistToDelete)}
        onClose={() => setPlaylistToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Playlist?"
        message={`Are you sure you want to delete "${playlistToDelete?.title}"? The videos themselves will remain in the catalog.`}
        confirmLabel="Delete Playlist"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};
