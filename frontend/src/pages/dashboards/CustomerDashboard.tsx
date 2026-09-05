import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Quotation, Invoice, Subscription } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  ShoppingBag,
  CreditCard,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
}

export const CustomerDashboard: React.FC<Props> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [customerQuotes, setCustomerQuotes] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    Promise.all([
      api.quotations.getAll(),
      api.billing.getInvoices(),
      api.billing.getSubscriptions(),
    ]).then(([quotesData, invData, subData]) => {
      setCustomerQuotes(quotesData);
      setInvoices(invData);
      setSubscriptions(subData);
    });
  }, []);

  const pendingNegotiationQuotes = customerQuotes.filter(
    (q) => q.status === 'APPROVED' || q.status === 'NEGOTIATION'
  );

  return (
    <div className="space-y-8">
      {/* Welcome Banner with Primary CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-800/60 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> Customer Portal
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Welcome, {user?.customerName || user?.name}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Review your commercial proposals, submit counter-discounts or questions, accept orders, and access official invoices.
            </p>
          </div>

          {/* PRIMARY CTA FOR CUSTOMER */}
          <button
            onClick={() => onNavigate('quotes')}
            className="px-6 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5"
          >
            <FileText className="w-5 h-5" />
            Review Active Quotes ({pendingNegotiationQuotes.length})
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Customer Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('quotes')}
          className="bg-slate-900/80 rounded-xl border border-purple-900/40 p-5 cursor-pointer hover:border-purple-600 transition-all"
        >
          <div className="text-slate-400 text-xs font-semibold uppercase">Active Proposals</div>
          <div className="text-2xl font-black text-purple-400 font-mono mt-1">{customerQuotes.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Quotations available for review</div>
        </div>

        <div
          onClick={() => onNavigate('orders')}
          className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 cursor-pointer hover:border-slate-700 transition-all"
        >
          <div className="text-slate-400 text-xs font-semibold uppercase">Confirmed Orders</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {customerQuotes.filter((q) => q.status === 'ACCEPTED').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Accepted agreements</div>
        </div>

        <div
          onClick={() => onNavigate('invoices')}
          className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 cursor-pointer hover:border-slate-700 transition-all"
        >
          <div className="text-slate-400 text-xs font-semibold uppercase">Invoices</div>
          <div className="text-2xl font-black text-white font-mono mt-1">{invoices.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Billing statements</div>
        </div>

        <div
          onClick={() => onNavigate('subscriptions')}
          className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 cursor-pointer hover:border-slate-700 transition-all"
        >
          <div className="text-slate-400 text-xs font-semibold uppercase">Subscriptions</div>
          <div className="text-2xl font-black text-indigo-400 font-mono mt-1">{subscriptions.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active recurring services</div>
        </div>
      </div>

      {/* Main Grid: Active Quotes & Customer Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Quotations Overview */}
        <div className="lg:col-span-2 bg-slate-900/70 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Commercial Proposals Ready for Review
              </h2>
              <p className="text-xs text-slate-400">Review line items, request custom discounts, or accept directly</p>
            </div>
            <button
              onClick={() => onNavigate('quotes')}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              Open Quotes <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {customerQuotes.map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-purple-800/50 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white text-sm">Quote #{q.quoteNumber}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Valid until: {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : 'Net 30'}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right font-mono">
                    <div className="font-bold text-white text-sm">₹{q.totalAmount.toLocaleString()}</div>
                    <div className="text-[11px] text-purple-400 font-semibold">{q.items?.length || 0} Products</div>
                  </div>
                  <button
                    onClick={() => onNavigate('quotes')}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
                  >
                    View & Negotiate
                  </button>
                </div>
              </div>
            ))}

            {customerQuotes.length === 0 && (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                No active quotations found for your account. Contact your account manager to generate a quote.
              </div>
            )}
          </div>
        </div>

        {/* Customer Portal Quick Navigation */}
        <div className="space-y-4">
          <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Portal Navigation</h2>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('quotes')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-950 text-purple-400 border border-purple-800">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-purple-400 transition-colors">My Quotes</div>
                    <div className="text-[11px] text-slate-500">Review line items & negotiate</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('orders')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-emerald-400 transition-colors">Orders</div>
                    <div className="text-[11px] text-slate-500">Confirmed purchase orders</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('invoices')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-indigo-400 transition-colors">Invoices & Statements</div>
                    <div className="text-[11px] text-slate-500">View tax invoices</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('subscriptions')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-950 text-brand-400 border border-brand-800">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-brand-400 transition-colors">Active Subscriptions</div>
                    <div className="text-[11px] text-slate-500">Recurring contract details</div>
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
