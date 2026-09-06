import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { DollarSign, PlusCircle, Edit, Trash2, X } from 'lucide-react';
import { Product } from '../../types';

export const AdminPricingView: React.FC = () => {
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);

  // Form
  const [productId, setProductId] = useState('');
  const [customerTierId, setCustomerTierId] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    Promise.all([
      api.admin.getPricingRules(),
      api.products.getAll(),
      api.customers.getTiers(),
    ]).then(([rules, prods, trs]) => {
      setPricingRules(rules);
      setProducts(prods);
      setTiers(trs);
      if (prods.length > 0 && !productId) setProductId(prods[0].id);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingRule(null);
    if (products.length > 0) {
      setProductId(products[0].id);
      setPrice(products[0].basePrice);
    }
    setCustomerTierId('');
    setShowModal(true);
  };

  const handleOpenEdit = (rule: any) => {
    setEditingRule(rule);
    setProductId(rule.productId);
    setCustomerTierId(rule.customerTierId || '');
    setPrice(rule.price);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingRule) {
        await api.admin.updatePricingRule(editingRule.id, { price });
      } else {
        await api.admin.createPricingRule({
          productId,
          customerTierId: customerTierId || undefined,
          price,
        });
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save pricing rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing rule override?')) return;
    try {
      await api.admin.deletePricingRule(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete pricing rule.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-brand-400" />
            Pricing Rules Configuration
          </h1>
          <p className="text-sm text-slate-400">
            Configure custom tier pricing overrides. The existing backend pricing engine remains the authoritative source of truth.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-brand-900/20 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          + Add Pricing Rule
        </button>
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
                <th className="p-3 text-right">Actions</th>
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
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700"
                        title="Edit Price"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg border border-red-800/40"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {pricingRules.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                    No custom pricing overrides configured. Default base list prices apply to all tiers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white">
                {editingRule ? 'Edit Pricing Rule' : 'Add Tier Pricing Rule'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Product</label>
                <select
                  disabled={!!editingRule}
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    const p = products.find((prod) => prod.id === e.target.value);
                    if (p) setPrice(p.basePrice);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Base: ₹{p.basePrice.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Customer Tier (Optional)</label>
                <select
                  disabled={!!editingRule}
                  value={customerTierId}
                  onChange={(e) => setCustomerTierId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">All Tiers (Global Tier Override)</option>
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} Tier
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Override Special Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 font-mono"
                  required
                />
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
                  {submitting ? 'Saving...' : editingRule ? 'Update Price' : 'Create Pricing Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
