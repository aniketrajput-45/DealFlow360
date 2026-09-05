import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Quotation, Product, Customer } from '../../types';
import { Badge } from '../../components/Badge';
import { QuoteDetailsModal } from '../../components/QuoteDetailsModal';
import { useAuth } from '../../context/AuthContext';
import {
  FilePlus,
  Kanban,
  Users,
  Package,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
}

export const SalesRepDashboard: React.FC<Props> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [recentQuotes, setRecentQuotes] = useState<Quotation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const loadData = () => {
    Promise.all([
      api.quotations.getAll(),
      api.products.getAll(),
      api.customers.getAll(),
    ]).then(([quotesData, prodsData, custsData]) => {
      setRecentQuotes(quotesData.slice(0, 5));
      setProducts(prodsData);
      setCustomers(custsData);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalValue = recentQuotes.reduce((sum, q) => sum + q.totalAmount, 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner with Primary CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-950 via-slate-900 to-indigo-950 border border-brand-800/60 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-brand-400 font-semibold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> Sales Rep Workspace
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Welcome back, {user?.name.split(' ')[0]} 👋
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Create structured sales quotations with real-time margin guidance, tier discount ceilings, and automated risk scoring.
            </p>
          </div>

          {/* PRIMARY CTA FOR SALES REP */}
          <button
            onClick={() => onNavigate('create-quote')}
            className="px-6 py-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-extrabold text-sm shadow-xl shadow-brand-500/30 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5"
          >
            <FilePlus className="w-5 h-5" />
            Create Quotation Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5">
          <div className="text-slate-400 text-xs font-semibold uppercase">Total Quotes</div>
          <div className="text-2xl font-black text-white font-mono mt-1">{recentQuotes.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active in pipeline</div>
        </div>

        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5">
          <div className="text-slate-400 text-xs font-semibold uppercase">Pipeline Value</div>
          <div className="text-2xl font-black text-brand-400 font-mono mt-1">₹{totalValue.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">Total deal potential</div>
        </div>

        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5">
          <div className="text-slate-400 text-xs font-semibold uppercase">Active Customers</div>
          <div className="text-2xl font-black text-indigo-400 font-mono mt-1">{customers.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Bronze, Silver & Gold Tiers</div>
        </div>

        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5">
          <div className="text-slate-400 text-xs font-semibold uppercase">Product Catalog</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{products.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Available SKUs</div>
        </div>
      </div>

      {/* Main Content Grid: Recent Quotes & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Quotes */}
        <div className="lg:col-span-2 bg-slate-900/70 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-400" />
                Recent Sales Quotations
              </h2>
              <p className="text-xs text-slate-400">Click any quotation to view details or respond to counter-offers</p>
            </div>
            <button
              onClick={() => onNavigate('quotations')}
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {recentQuotes.map((q) => {
              const marginPct = q.totalAmount > 0 ? (q.totalMargin / q.totalAmount) * 100 : 0;
              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuoteId(q.id)}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-brand-500/50 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-white text-sm group-hover:text-brand-400 transition-colors">
                      {q.customer?.companyName || 'Corporate Client'}
                    </div>
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                      <span>{q.quoteNumber}</span>
                      <span>•</span>
                      <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right font-mono">
                      <div className="font-bold text-white text-sm">₹{q.totalAmount.toLocaleString()}</div>
                      <div className="text-[11px] text-emerald-400 font-semibold">{marginPct.toFixed(1)}% Margin</div>
                    </div>
                    <Badge status={q.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rep Quick Actions */}
        <div className="space-y-4">
          <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Quick Actions</h2>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('create-quote')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-950 text-brand-400 border border-brand-800">
                    <FilePlus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-brand-400 transition-colors">Quotation Builder</div>
                    <div className="text-[11px] text-slate-500">Draft new quotation</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-brand-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('pipeline')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800">
                    <Kanban className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-indigo-400 transition-colors">My Pipeline</div>
                    <div className="text-[11px] text-slate-500">Kanban stage tracking</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('customers')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-emerald-400 transition-colors">Customer Directory</div>
                    <div className="text-[11px] text-slate-500">View customer tiers</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('products')}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-900 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-800">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-amber-400 transition-colors">Product Catalog</div>
                    <div className="text-[11px] text-slate-500">Pricing & category limits</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Details & Counter Offer Review Modal */}
      {selectedQuoteId && (
        <QuoteDetailsModal
          quoteId={selectedQuoteId}
          onClose={() => setSelectedQuoteId(null)}
          onQuoteUpdated={loadData}
        />
      )}
    </div>
  );
};
