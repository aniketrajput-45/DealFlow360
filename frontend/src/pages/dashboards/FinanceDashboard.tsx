import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Approval, Invoice, Subscription } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  CreditCard,
  CheckSquare,
  DollarSign,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
}

export const FinanceDashboard: React.FC<Props> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [financeApprovals, setFinanceApprovals] = useState<Approval[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    Promise.all([
      api.approvals.getAll('PENDING'),
      api.billing.getInvoices(),
      api.billing.getSubscriptions(),
    ]).then(([apprData, invData, subData]) => {
      // Filter for finance level approvals
      setFinanceApprovals(
        apprData.filter(
          (a) => a.approvalLevel.includes('FINANCE') || a.approvalLevel.includes('EXECUTIVE')
        )
      );
      setInvoices(invData);
      setSubscriptions(subData);
    });
  }, []);

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const mrr = subscriptions.reduce((sum, s) => sum + s.unitPrice * s.quantity, 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner with Primary CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-800/60 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> Finance Workspace
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Finance & Commercial Control — {user?.name.split(' ')[0]}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Oversee high-risk discount financial approvals, issue official invoices, record customer payments, and manage subscription billing.
            </p>
          </div>

          {/* PRIMARY CTA FOR FINANCE */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onNavigate('approvals')}
              className="px-6 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5"
            >
              <CheckSquare className="w-5 h-5" />
              Finance Approvals ({financeApprovals.length})
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Finance Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('approvals')}
          className="bg-slate-900/80 rounded-xl border border-emerald-900/40 p-5 cursor-pointer hover:border-emerald-600 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-xs font-semibold uppercase">Finance Approvals</div>
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{financeApprovals.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">High-risk discount overrides</div>
        </div>

        <div
          onClick={() => onNavigate('invoices')}
          className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 cursor-pointer hover:border-slate-700 transition-all"
        >
          <div className="text-slate-400 text-xs font-semibold uppercase">Total Invoiced</div>
          <div className="text-2xl font-black text-white font-mono mt-1">₹{totalInvoiced.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">{invoices.length} billing documents</div>
        </div>

        <div
          onClick={() => onNavigate('billing')}
          className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 cursor-pointer hover:border-slate-700 transition-all"
        >
          <div className="text-slate-400 text-xs font-semibold uppercase">Subscription MRR</div>
          <div className="text-2xl font-black text-teal-400 font-mono mt-1">₹{mrr.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">{subscriptions.length} recurring accounts</div>
        </div>

        <div
          onClick={() => onNavigate('payments')}
          className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 cursor-pointer hover:border-slate-700 transition-all"
        >
          <div className="text-slate-400 text-xs font-semibold uppercase">Payments Recorded</div>
          <div className="text-2xl font-black text-indigo-400 font-mono mt-1">
            {invoices.filter((i) => i.status === 'PAID').length} Paid
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Reconciled invoices</div>
        </div>
      </div>

      {/* Finance Approvals & Invoicing Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Finance Queue */}
        <div className="lg:col-span-2 bg-slate-900/70 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                Pending Finance-Level Approval Requests
              </h2>
              <p className="text-xs text-slate-400">Quotations requiring Finance or Executive approval due to extreme discounts</p>
            </div>
            <button
              onClick={() => onNavigate('approvals')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Open Approvals <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {financeApprovals.map((appr) => {
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
                      <span className="text-emerald-400 font-medium">{appr.approvalLevel}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right font-mono">
                      <div className="font-bold text-white text-sm">₹{appr.quotation?.totalAmount?.toLocaleString()}</div>
                      <div className="text-[11px] text-rose-400 font-semibold">{discPercent.toFixed(1)}% Discount</div>
                    </div>
                    <button
                      onClick={() => onNavigate('approvals')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm"
                    >
                      Review & Sign
                    </button>
                  </div>
                </div>
              );
            })}

            {financeApprovals.length === 0 && (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                No pending finance-level approval requests. All clear!
              </div>
            )}
          </div>
        </div>

        {/* Finance Quick Action Links */}
        <div className="space-y-4">
          <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Finance Modules</h2>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('approvals')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-emerald-400 transition-colors">Finance Approvals</div>
                    <div className="text-[11px] text-slate-500">Sign off on high-risk quotes</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('invoices')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-indigo-400 transition-colors">Invoices</div>
                    <div className="text-[11px] text-slate-500">Issue commercial invoices</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('payments')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-950 text-teal-400 border border-teal-800">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-teal-400 transition-colors">Payment Recording</div>
                    <div className="text-[11px] text-slate-500">Reconcile customer wire transfers</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('billing')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-950 text-brand-400 border border-brand-800">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-brand-400 transition-colors">Subscriptions & Schedules</div>
                    <div className="text-[11px] text-slate-500">Recurring commercial contracts</div>
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
