import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Award, Layers, ShieldCheck, Edit, X } from 'lucide-react';

interface DiscountGovData {
  customerTiers: Array<{
    id: string;
    name: string;
    maxDiscountPercent: number;
  }>;
  categoryCeilings: Array<{
    categoryId: string;
    categoryName: string;
    maxDiscountPercent: number;
    approvalLevel: string;
  }>;
}

export const AdminDiscountGovernanceView: React.FC = () => {
  const [data, setData] = useState<DiscountGovData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingTier, setEditingTier] = useState<{ id: string; name: string; maxDiscountPercent: number } | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ categoryId: string; categoryName: string; maxDiscountPercent: number; approvalLevel: string } | null>(null);
  const [newMaxDiscount, setNewMaxDiscount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

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

  const handleOpenEditTier = (t: { id: string; name: string; maxDiscountPercent: number }) => {
    setEditingTier(t);
    setNewMaxDiscount(t.maxDiscountPercent);
  };

  const handleOpenEditCategory = (c: { categoryId: string; categoryName: string; maxDiscountPercent: number; approvalLevel: string }) => {
    setEditingCategory(c);
    setNewMaxDiscount(c.maxDiscountPercent);
  };

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;
    setSubmitting(true);
    try {
      await api.admin.updateCustomerTierCeiling(editingTier.id, newMaxDiscount);
      setEditingTier(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update tier discount ceiling.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setSubmitting(true);
    try {
      await api.admin.updateCategoryDiscountRule(editingCategory.categoryId, newMaxDiscount, editingCategory.approvalLevel);
      setEditingCategory(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update category discount ceiling.');
    } finally {
      setSubmitting(false);
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
                <div key={tier.id || tier.name} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <span className="font-medium text-slate-200">{tier.name} Tier</span>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-sm font-semibold rounded-full border border-emerald-500/20">
                      Max {tier.maxDiscountPercent}%
                    </span>
                    <button
                      onClick={() => handleOpenEditTier(tier)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700"
                      title="Edit Tier Ceiling"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                <div key={cat.categoryId || cat.categoryName} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <span className="font-medium text-slate-200">{cat.categoryName}</span>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm font-semibold rounded-full border border-blue-500/20">
                      Max {cat.maxDiscountPercent}%
                    </span>
                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700"
                      title="Edit Category Ceiling"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

      {/* Edit Tier Modal */}
      {editingTier && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white">Edit {editingTier.name} Tier Discount Ceiling</h3>
              <button onClick={() => setEditingTier(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Max Discount Ceiling (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={newMaxDiscount}
                  onChange={(e) => setNewMaxDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 font-mono text-sm"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20"
                >
                  {submitting ? 'Saving...' : 'Save Tier Ceiling'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white">Edit {editingCategory.categoryName} Discount Ceiling</h3>
              <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Max Category Discount Ceiling (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={newMaxDiscount}
                  onChange={(e) => setNewMaxDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20"
                >
                  {submitting ? 'Saving...' : 'Save Category Ceiling'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
