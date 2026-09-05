import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Customer, CustomerTier } from '../../types';
import { Users, Award } from 'lucide-react';

export const CustomerListView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tiers, setTiers] = useState<CustomerTier[]>([]);

  useEffect(() => {
    Promise.all([api.customers.getAll(), api.customers.getTiers()]).then(([custData, tierData]) => {
      setCustomers(custData);
      setTiers(tierData);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-brand-400" />
          Customer Directory & Commercial Tiers
        </h1>
        <p className="text-sm text-slate-400">View customer accounts, assigned pricing tiers (Bronze, Silver, Gold), and maximum discount ceilings.</p>
      </div>

      {/* Tiers Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <div key={t.id} className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-brand-400" /> {t.name} Tier
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">Max {t.maxDiscountPercent}% Off</span>
            </div>
            <p className="text-xs text-slate-400">{t.description || 'Standard commercial tier'}</p>
          </div>
        ))}
      </div>

      {/* Customer List */}
      <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-base font-bold text-white mb-4">Active Accounts</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">Company Name</th>
                <th className="p-3">Tier</th>
                <th className="p-3">Annual Spend</th>
                <th className="p-3">Max Tier Discount</th>
                <th className="p-3">Credit Term</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-bold text-white">{c.companyName}</td>
                  <td className="p-3 font-semibold text-brand-400">{c.tier?.name || 'Bronze'}</td>
                  <td className="p-3 font-mono text-slate-300">₹{(c.stats?.totalValue || 0).toLocaleString()}</td>
                  <td className="p-3 font-mono text-emerald-400 font-bold">{c.tier?.maxDiscountPercent || 15}%</td>
                  <td className="p-3 text-slate-400">30 Days Net</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
