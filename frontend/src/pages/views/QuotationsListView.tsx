import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Quotation } from '../../types';
import { Badge } from '../../components/Badge';
import { FileText } from 'lucide-react';

export const QuotationsListView: React.FC = () => {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    api.quotations.getAll().then(setQuotes);
  }, []);

  const filteredQuotes = quotes.filter((q) => {
    if (filter === 'ALL') return true;
    return q.status === filter;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-400" />
            Quotations Master List
          </h1>
          <p className="text-sm text-slate-400">Comprehensive list of generated sales proposals, discounts, and approval states.</p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['ALL', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACCEPTED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === st
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">Quote #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Blended Discount</th>
                <th className="p-3">Margin %</th>
                <th className="p-3">Risk Score</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredQuotes.map((q) => {
                const subtotal = q.subtotal || 1;
                const discPercent = (q.discountAmount / subtotal) * 100;
                const marginPercent = q.totalAmount > 0 ? (q.totalMargin / q.totalAmount) * 100 : 0;

                return (
                  <tr key={q.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-mono font-bold text-white">{q.quoteNumber}</td>
                    <td className="p-3 font-semibold text-slate-200">{q.customer?.companyName}</td>
                    <td className="p-3 font-mono font-bold text-white">₹{q.totalAmount.toLocaleString()}</td>
                    <td className="p-3 font-mono text-rose-400">{discPercent.toFixed(1)}%</td>
                    <td className="p-3 font-mono text-emerald-400">{marginPercent.toFixed(1)}%</td>
                    <td className="p-3">
                      <Badge status={String(q.riskScore)} type="risk" />
                    </td>
                    <td className="p-3">
                      <Badge status={q.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
