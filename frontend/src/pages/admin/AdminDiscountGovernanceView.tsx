import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Award, Layers, ShieldCheck } from 'lucide-react';

interface DiscountGovData {
  customerTiers: Array<{
    id: string;
    tier: string;
    maxDiscountPercentage: number;
  }>;
  categoryCeilings: Array<{
    id: string;
    category: string;
    maxDiscountPercentage: number;
  }>;
}

export const AdminDiscountGovernanceView: React.FC = () => {
  const [data, setData] = useState<DiscountGovData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getDiscountGovernance();
      setData(res);
    } catch (err) {
      console.error('Failed to load discount governance data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading discount governance rules...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Discount Governance & Guardrails</h1>
        <p className="text-slate-400 text-sm mt-1">
          System discount ceilings by customer tier and product category used by the Deal Risk & Approval engine.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tier Limits */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Customer Tier Discount Ceilings</h2>
              <p className="text-xs text-slate-400">Maximum standard discount permitted per tier</p>
            </div>
          </div>

          <div className="space-y-3">
            {data?.customerTiers && data.customerTiers.length > 0 ? (
              data.customerTiers.map((tier) => (
                <div key={tier.id || tier.tier} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <span className="font-medium text-slate-200">{tier.tier} Tier</span>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-sm font-semibold rounded-full border border-emerald-500/20">
                    Max {tier.maxDiscountPercentage}%
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm bg-slate-800/30 rounded-lg">
                No tier rule overrides set (System default guardrails apply).
              </div>
            )}
          </div>
        </div>

        {/* Category Ceilings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Product Category Ceilings</h2>
              <p className="text-xs text-slate-400">Discount caps enforced per product line</p>
            </div>
          </div>

          <div className="space-y-3">
            {data?.categoryCeilings && data.categoryCeilings.length > 0 ? (
              data.categoryCeilings.map((cat) => (
                <div key={cat.id || cat.category} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <span className="font-medium text-slate-200">{cat.category}</span>
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm font-semibold rounded-full border border-blue-500/20">
                    Max {cat.maxDiscountPercentage}%
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm bg-slate-800/30 rounded-lg">
                Standard category rules active (Hardware: 15%, Software: 20%, Services: 10%).
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approval Routing Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Approval Routing & Risk Thresholds</h2>
            <p className="text-xs text-slate-400">Engine-enforced governance thresholds for discount approvals</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Discount Range</th>
                <th className="py-3 px-4">Deal Risk Level</th>
                <th className="py-3 px-4">Required Approvers</th>
                <th className="py-3 px-4">Margin Floor Protection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm text-slate-300">
              <tr>
                <td className="py-3 px-4 font-medium text-slate-100">0% – 10%</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded">LOW RISK</span></td>
                <td className="py-3 px-4">Auto-approved / Sales Rep</td>
                <td className="py-3 px-4 text-slate-400">Standard Margin Tier</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-slate-100">10.1% – 20%</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs rounded">MEDIUM RISK</span></td>
                <td className="py-3 px-4 font-semibold text-amber-300">Sales Manager</td>
                <td className="py-3 px-4 text-slate-400">Min 20% Gross Margin</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-slate-100">&gt; 20%</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded">HIGH RISK / CRITICAL</span></td>
                <td className="py-3 px-4 font-semibold text-red-300">Sales Manager + Finance</td>
                <td className="py-3 px-4 text-slate-400">Executive Finance Review Required</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
