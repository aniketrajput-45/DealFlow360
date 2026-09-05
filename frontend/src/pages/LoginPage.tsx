import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Key, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Invalid credentials. Please verify email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillQuickAcc = (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 selection:bg-brand-500 selection:text-white relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Brand & Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 items-center justify-center font-black text-white text-xl shadow-lg shadow-brand-500/25">
            DF
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            DealFlow<span className="text-brand-400">360</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Commercial Deal Management & Governance Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Sign in to your account</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your corporate email and password to access your role workspace.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? 'Authenticating...' : 'Sign In'}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Demo Credentials Shortcuts */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-brand-400" /> Hackathon Demo Accounts:
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => fillQuickAcc('rep@dealflow360.com')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-colors"
              >
                <div className="font-semibold text-slate-200">Alex Rep</div>
                <div className="text-[10px] text-slate-500">Sales Representative</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAcc('manager@dealflow360.com')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-colors"
              >
                <div className="font-semibold text-slate-200">Sarah Manager</div>
                <div className="text-[10px] text-slate-500">Sales Manager</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAcc('finance@dealflow360.com')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-colors"
              >
                <div className="font-semibold text-slate-200">David Finance</div>
                <div className="text-[10px] text-slate-500">Finance Controller</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAcc('customer@abccorp.com')}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-colors"
              >
                <div className="font-semibold text-purple-300">ABC Corp</div>
                <div className="text-[10px] text-slate-500">Customer Portal</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAcc('admin@dealflow360.com')}
                className="col-span-2 p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-amber-300">System Admin</div>
                  <div className="text-[10px] text-slate-500">System Administrator</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded border border-amber-500/20 font-mono">
                  admin@dealflow360.com
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
