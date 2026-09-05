import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Quotation } from '../../types';
import { TrendingUp } from 'lucide-react';

export const TeamPerformanceView: React.FC = () => {
  const [quotes, setQuotes] = useState<Quotation[]>([]);

  useEffect(() => {
    api.quotations.getAll().then(setQuotes);
  }, []);

  // Group quotes by sales rep
  const repStats = quotes.reduce((acc, q) => {
    const repName = q.createdBy?.name || 'Unassigned Rep';
    if (!acc[repName]) {
      acc[repName] = { name: repName, count: 0, totalAmount: 0, avgDiscount: 0, totalDiscount: 0 };
    }
    const subtotal = q.subtotal || 1;
    const discPercent = (q.discountAmount / subtotal) * 100;
    acc[repName].count += 1;
    acc[repName].totalAmount += q.totalAmount;
    acc[repName].totalDiscount += discPercent;
    return acc;
  }, {} as Record<string, { name: string; count: number; totalAmount: number; avgDiscount: number; totalDiscount: number }>);

  const reps = Object.values(repStats).map((r) => ({
    ...r,
    avgDiscount: r.count > 0 ? r.totalDiscount / r.count : 0,
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-brand-400" />
          Sales Team Performance & Discount Velocity
        </h1>
        <p className="text-sm text-slate-400">Monitor rep quotation volume, average requested discounts, and team commercial efficiency.</p>
      </div>

      <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">Sales Representative</th>
                <th className="p-3">Total Quotes Generated</th>
                <th className="p-3">Gross Pipeline Value</th>
                <th className="p-3">Average Discount Given</th>
                <th className="p-3">Governance Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {reps.map((r) => (
                <tr key={r.name} className="hover:bg-slate-800/30">
                  <td className="p-3 font-bold text-white flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-950 text-brand-400 font-extrabold flex items-center justify-center border border-brand-800 text-xs">
                      {r.name.charAt(0)}
                    </div>
                    {r.name}
                  </td>
                  <td className="p-3 font-mono font-bold text-white">{r.count} Quotes</td>
                  <td className="p-3 font-mono text-emerald-400 font-bold">₹{r.totalAmount.toLocaleString()}</td>
                  <td className="p-3 font-mono text-rose-400 font-bold">{r.avgDiscount.toFixed(1)}%</td>
                  <td className="p-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Standard Governance
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
