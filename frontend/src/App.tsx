import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, TrendingUp, Layers } from 'lucide-react';

export default function App() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          setApiStatus('connected');
        } else {
          setApiStatus('disconnected');
        }
      })
      .catch(() => setApiStatus('disconnected'));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-brand-500/20">
              DF
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">DealFlow<span className="text-brand-400">360</span></span>
              <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-brand-950 text-brand-300 border border-brand-800/60 uppercase">Enterprise CPQ</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700/60">
              <span className={`h-2 w-2 rounded-full ${
                apiStatus === 'connected' ? 'bg-emerald-400 animate-pulse' :
                apiStatus === 'checking' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'
              }`} />
              <span className="text-slate-300">
                Backend: {apiStatus === 'connected' ? 'Connected (Port 5000)' : apiStatus === 'checking' ? 'Connecting...' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Welcome */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full flex flex-col justify-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-950/60 text-brand-300 border border-brand-800/60 mb-6">
            <ShieldAlert className="w-3.5 h-3.5 text-brand-400" />
            Phase 1 Initialized — Architecture & Workspace Foundation
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Intelligent, Self-Governing <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-300 to-teal-300">
              Deal Operations Platform
            </span>
          </h1>
          <p className="text-lg text-slate-400 mb-8 leading-relaxed">
            Multi-tier discount governance, real-time blended risk routing, intelligent warehouse fulfillment auto-splitting, and restricted customer portal negotiation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-brand-400 font-semibold text-sm mb-1">
                <CheckCircle2 className="w-4 h-4" /> SQLite Portability
              </div>
              <p className="text-xs text-slate-400">Zero-dependency local database powered by Prisma ORM</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
                <TrendingUp className="w-4 h-4" /> Blended Risk Engine
              </div>
              <p className="text-xs text-slate-400">Mathematical discount governance across tiers & categories</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-1">
                <Layers className="w-4 h-4" /> Hybrid Invoicing
              </div>
              <p className="text-xs text-slate-400">Unified handling of one-time hardware & recurring subscriptions</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
