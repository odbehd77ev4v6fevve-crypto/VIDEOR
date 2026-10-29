import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Film, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from './Modal';

export type AuthModalMode = 'login' | 'register';

interface AuthModalProps {
  isOpen: boolean;
  mode: AuthModalMode;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, mode, onClose }) => {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentMode, setCurrentMode] = useState<AuthModalMode>(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentMode(mode);
    setError(null);
  }, [mode, isOpen]);

  const locationState = (location.state as { from?: { pathname?: string } } | null) ?? null;
  const from = locationState?.from?.pathname || '/';

  const title = useMemo(
    () => (currentMode === 'login' ? 'Welcome back' : 'Create your account'),
    [currentMode]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (currentMode === 'register') {
      if (!displayName.trim()) {
        setError('Display name is required.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const user =
        currentMode === 'login'
          ? await login(email.trim(), password)
          : await register(email.trim(), password, displayName.trim());

      const welcomeMessage =
        currentMode === 'login'
          ? `Welcome back, ${user.displayName}!`
          : `Welcome to VIDORA, ${user.displayName}!`;

      showToast(welcomeMessage, 'success');
      onClose();

      if (user.role === 'admin' && location.pathname.includes('/admin')) {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const buttonLabel = currentMode === 'login' ? 'Sign In' : 'Create Account';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      description={
        currentMode === 'login'
          ? 'Access your saved videos, playlists, and watch history.'
          : 'Start tracking your watchlist and saving your favorite films.'
      }
    >
      <div className="flex items-center justify-center pb-5">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 shadow-lg shadow-slate-950/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 via-rose-500 to-amber-500 p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#090a0f]">
              <Film className="h-5 w-5 text-rose-500" />
            </div>
          </div>
          <span className="font-mono text-lg font-extrabold tracking-[0.22em] text-white">VIDORA</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {currentMode === 'register' && (
          <div className="space-y-1.5">
            <label htmlFor="auth-display-name" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              Display Name
            </label>
            <input
              id="auth-display-name"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Cinema Enthusiast"
              autoComplete="name"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="auth-email" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
            Email Address
          </label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            autoComplete={currentMode === 'login' ? 'email' : 'email'}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
            required
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="auth-password" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              Password
            </label>
            {currentMode === 'login' && (
              <Link to="/forgot-password" className="text-[11px] font-medium text-rose-400 transition-colors hover:text-rose-300">
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={currentMode === 'login' ? 'current-password' : 'new-password'}
              minLength={currentMode === 'register' ? 8 : undefined}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 pr-11 text-sm text-white placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-white"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/40 transition-transform hover:translate-y-[-1px] hover:from-rose-500 hover:to-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {currentMode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {isLoading ? (currentMode === 'login' ? 'Authenticating...' : 'Creating account...') : buttonLabel}
        </button>
      </form>

      <div className="mt-5 border-t border-slate-800 pt-4 text-center text-xs text-slate-400">
        {currentMode === 'login' ? (
          <>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setCurrentMode('register')}
              className="font-semibold text-rose-400 transition-colors hover:text-rose-300"
            >
              Create one now
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setCurrentMode('login')}
              className="font-semibold text-rose-400 transition-colors hover:text-rose-300"
            >
              Sign in here
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};
