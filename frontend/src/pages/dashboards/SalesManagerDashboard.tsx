import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Approval, DealHealthAlerts, Quotation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  CheckSquare,
  AlertTriangle,
  Kanban,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
}

export const SalesManagerDashboard: React.FC<Props> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [dealHealth, setDealHealth] = useState<DealHealthAlerts | null>(null);
  const [quotes, setQuotes] = useState<Quotation[]>([]);

  useEffect(() => {
    Promise.all([
      api.approvals.getAll('PENDING'),
      api.reporting.getHealth(),
      api.quotations.getAll(),
    ]).then(([apprData, healthData, quotesData]) => {
      setPendingApprovals(apprData);
      setDealHealth(healthData);
      setQuotes(quotesData);
    });
  }, []);

  const totalPipelineValue = quotes.reduce((sum, q) => sum + q.totalAmount, 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner with Primary CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-brand-950 border border-amber-800/60 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> Sales Manager Workspace
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Manager Control Center — {user?.name.split(' ')[0]}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Review high-discount quotation requests, govern sales margins, and maintain deal health velocity.
            </p>
          </div>

          {/* PRIMARY CTA FOR SALES MANAGER */}
          <button
            onClick={() => onNavigate('approvals')}
            className="px-6 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5"
          >
            <CheckSquare className="w-5 h-5" />
            Review Pending Approvals ({pendingApprovals.length})
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('approvals')}
          className="bg-slate-900/80 rounded-xl border border-amber-900/40 p-5 cursor-pointer hover:border-amber-600 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-xs font-semibold uppercase">Pending Approvals</div>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">{pendingApprovals.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Requires manager review</div>
        </div>

        <div
          onClick={() => onNavigate('health')}
          className="bg-slate-900/80 rounded-xl border border-rose-900/40 p-5 cursor-pointer hover:border-rose-600 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-xs font-semibold uppercase">Discount Anomalies</div>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono mt-1">
            {dealHealth?.discountAnomalies?.length || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Discount &gt; 1.5x rep avg</div>
        </div>

        <div
          onClick={() => onNavigate('pipeline')}
          className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 cursor-pointer hover:border-slate-700 transition-all"
        >
          <div className="text-slate-400 text-xs font-semibold uppercase">Team Pipeline Value</div>
          <div className="text-2xl font-black text-white font-mono mt-1">₹{totalPipelineValue.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">Total active deal volume</div>
        </div>

        <div
          onClick={() => onNavigate('health')}
          className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 cursor-pointer hover:border-slate-700 transition-all"
        >
          <div className="text-slate-400 text-xs font-semibold uppercase">Stalled Deals</div>
          <div className="text-2xl font-black text-slate-300 font-mono mt-1">
            {dealHealth?.stalledDeals?.length || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Stagnant &gt; 7 days</div>
        </div>
      </div>

      {/* Main Grid: Pending Approvals Queue & Deal Health Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals Widget */}
        <div className="lg:col-span-2 bg-slate-900/70 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                Urgent Pending Approval Requests
              </h2>
              <p className="text-xs text-slate-400">Quotations exceeding standard rep discount ceilings requiring governance</p>
            </div>
            <button
              onClick={() => onNavigate('approvals')}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              Open Center <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {pendingApprovals.map((appr) => {
              const subtotal = appr.quotation?.subtotal || 1;
              const discAmt = appr.quotation?.discountAmount || 0;
              const discPercent = (discAmt / subtotal) * 100;

              return (
                <div
                  key={appr.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-white text-sm">{appr.quotation?.customer?.companyName || 'Corporate Client'}</div>
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                      <span>Quote #{appr.quotation?.quoteNumber}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-medium">Req Level: {appr.approvalLevel}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right font-mono">
                      <div className="font-bold text-white text-sm">₹{appr.quotation?.totalAmount?.toLocaleString()}</div>
                      <div className="text-[11px] text-rose-400 font-semibold">{discPercent.toFixed(1)}% Discount</div>
                    </div>
                    <button
                      onClick={() => onNavigate('approvals')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm"
                    >
                      Review
                    </button>
                  </div>
                </div>
              );
            })}

            {pendingApprovals.length === 0 && (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                No pending approvals currently require manager review. All set!
              </div>
            )}
          </div>
        </div>

        {/* Manager Quick Navigation & Team Health */}
        <div className="space-y-4">
          <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Manager Modules</h2>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('approvals')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-800">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-amber-400 transition-colors">Approval Center</div>
                    <div className="text-[11px] text-slate-500">Approve or reject discount overrides</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('health')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-950 text-rose-400 border border-rose-800">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-rose-400 transition-colors">Deal Health & Alerts</div>
                    <div className="text-[11px] text-slate-500">Discount anomalies & stalled deals</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-rose-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('pipeline')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800">
                    <Kanban className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-indigo-400 transition-colors">Sales Pipeline</div>
                    <div className="text-[11px] text-slate-500">Full team deal Kanban board</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('team')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-950 text-brand-400 border border-brand-800">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-brand-400 transition-colors">Team Performance</div>
                    <div className="text-[11px] text-slate-500">Sales velocity & discount metrics</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-brand-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
