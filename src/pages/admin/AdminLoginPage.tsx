import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Film, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const AdminLoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const user = await login(email, password);
      if (user.role !== 'admin') {
        setError('Your account is authenticated but does not possess administrative privileges.');
        return;
      }
      showToast('Welcome to the VIDORA Administration Portal.', 'success');
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Administrative authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080c] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 mx-auto shadow-xl shadow-amber-950/40">
            <div className="w-full h-full bg-[#090a0f] rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-amber-500" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight font-mono">VIDORA CONTROL CENTER</h1>
          <p className="text-xs text-slate-400">
            Protected management portal for verified staff and content curators.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Staff Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-950/40 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              {isLoading ? 'Verifying Credentials...' : 'Authenticate to CMS'}
            </button>
          </form>

          <div className="pt-2 text-center">
            <Link to="/" className="text-xs text-slate-400 hover:text-white transition-colors">
              ← Return to Public Site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
