import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { DollarSign } from 'lucide-react';

export const AdminPricingView: React.FC = () => {
  const [pricingRules, setPricingRules] = useState<any[]>([]);

  useEffect(() => {
    api.admin.getPricingRules().then(setPricingRules);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-brand-400" />
          Pricing Rules Configuration
        </h1>
        <p className="text-sm text-slate-400">
          Inspect custom customer tier pricing overrides. The existing backend pricing engine remains the authoritative source of truth.
        </p>
      </div>

      <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Base Price</th>
                <th className="p-3">Target Customer Tier</th>
                <th className="p-3">Tier Override Price</th>
                <th className="p-3">Currency</th>
                <th className="p-3">Rule Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {pricingRules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-bold text-white font-sans">{r.product?.name}</td>
                  <td className="p-3 text-slate-400">₹{r.product?.basePrice?.toLocaleString()}</td>
                  <td className="p-3 text-brand-400 font-sans font-semibold">
                    {r.customerTier?.name || 'All Tiers'}
                  </td>
                  <td className="p-3 font-bold text-emerald-400">₹{r.price.toLocaleString()}</td>
                  <td className="p-3 text-slate-400">{r.currency || 'INR'}</td>
                  <td className="p-3">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}

              {pricingRules.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                    No custom pricing overrides configured. Default base list prices apply to all tiers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
