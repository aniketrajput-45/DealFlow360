import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { ArrowRight, Info, CheckCircle, PlusCircle, Trash2, X } from 'lucide-react';
import { Product } from '../../types';

interface UpsellRuleData {
  id: string;
  sourceProductId: string;
  sourceProduct?: {
    name: string;
  };
  suggestedProductId: string;
  suggestedProduct?: {
    name: string;
  };
  promotionTag?: string;
  priority?: number;
  isActive?: boolean;
}

export const AdminUpsellRulesView: React.FC = () => {
  const [rules, setRules] = useState<UpsellRuleData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [sourceProductId, setSourceProductId] = useState('');
  const [suggestedProductId, setSuggestedProductId] = useState('');
  const [promotionTag, setPromotionTag] = useState('HOT COMBO');
  const [priority, setPriority] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRules, resProducts] = await Promise.all([
        api.admin.getUpsellRules(),
        api.products.getAll(),
      ]);
      setRules(Array.isArray(resRules) ? resRules : (resRules as any).rules || (resRules as any).data || []);
      setProducts(resProducts);
      if (resProducts.length > 0) {
        setSourceProductId(resProducts[0].id);
        if (resProducts.length > 1) setSuggestedProductId(resProducts[1].id);
      }
    } catch (err) {
      console.error('Failed to fetch upsell rules', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    if (products.length >= 2) {
      setSourceProductId(products[0].id);
      setSuggestedProductId(products[1].id);
    }
    setPromotionTag('HOT COMBO');
    setPriority(1);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceProductId === suggestedProductId) {
      alert('Source product and recommended product must be different.');
      return;
    }
    setSubmitting(true);
    try {
      await api.admin.createUpsellRule({
        sourceProductId,
        suggestedProductId,
        promotionTag,
        priority,
      });
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create upsell rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this upsell rule?')) return;
    try {
      await api.admin.deleteUpsellRule(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete upsell rule.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Upsell & Cross-sell Governance Rules</h1>
          <p className="text-slate-400 text-sm mt-1">
            Automated recommendations and cross-selling rules suggested during quotation creation.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-brand-900/20 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          + Add Cross-sell Rule
        </button>
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 text-blue-300 text-sm">
        <Info className="w-5 h-5 flex-shrink-0 text-blue-400 mt-0.5" />
        <div>
          <span className="font-semibold text-blue-200">System Cross-Sell Governance</span>
          <p className="text-xs text-blue-300/80 mt-0.5">
            Rules are evaluated in real-time by the recommendation engine based on trigger product selections and priority order.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading cross-sell rules...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Trigger Product</th>
                  <th className="py-3.5 px-4"></th>
                  <th className="py-3.5 px-4">Recommended Cross-sell Product</th>
                  <th className="py-3.5 px-4 text-center">Promotion Tag</th>
                  <th className="py-3.5 px-4 text-center">Priority</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                {rules.map((rule) => {
                  const triggerName = rule.sourceProduct?.name || (rule.sourceProductId ? `Product ID: ${rule.sourceProductId.substring(0, 8)}...` : 'Unknown Product');
                  const recName = rule.suggestedProduct?.name || (rule.suggestedProductId ? `Product ID: ${rule.suggestedProductId.substring(0, 8)}...` : 'Unknown Recommendation');

                  return (
                    <tr key={rule.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-100">
                        {triggerName}
                      </td>
                      <td className="py-3.5 px-2 text-center text-slate-500">
                        <ArrowRight className="w-4 h-4 mx-auto text-emerald-400" />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-300">
                        {recName}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs">
                        <span className="px-2 py-0.5 bg-brand-500/10 text-brand-300 border border-brand-500/20 rounded font-semibold">
                          {rule.promotionTag || 'HOT COMBO'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400">
                        Priority {rule.priority || 1}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg border border-red-800/40"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No upsell or cross-sell rules configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white">Add Upsell / Cross-Sell Rule</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Trigger Product (When selected in quote)</label>
                <select
                  value={sourceProductId}
                  onChange={(e) => setSourceProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.basePrice.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Recommended Cross-sell Product</label>
                <select
                  value={suggestedProductId}
                  onChange={(e) => setSuggestedProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.basePrice.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Promotion Tag</label>
                  <input
                    type="text"
                    value={promotionTag}
                    onChange={(e) => setPromotionTag(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500"
                    placeholder="HOT COMBO, ESSENTIAL ADDON"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Priority (1 = Highest)</label>
                  <input
                    type="number"
                    min="1"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-900/20"
                >
                  {submitting ? 'Creating...' : 'Create Upsell Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
