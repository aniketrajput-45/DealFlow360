import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Product, ProductCategory } from '../../types';
import { Package, PlusCircle, Edit, CheckCircle2, X } from 'lucide-react';

export const AdminProductsView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('unit');
  const [basePrice, setBasePrice] = useState<number>(50000);
  const [costPrice, setCostPrice] = useState<number>(35000);
  const [taxPercent, setTaxPercent] = useState<number>(18);
  const [productType, setProductType] = useState<'ONE_TIME' | 'RECURRING'>('ONE_TIME');
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = () => {
    Promise.all([api.products.getAll(), api.products.getCategories()]).then(([prods, cats]) => {
      setProducts(prods);
      setCategories(cats);
      if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setUnit('unit');
    setBasePrice(50000);
    setCostPrice(35000);
    setTaxPercent(18);
    setProductType('ONE_TIME');
    setBillingInterval('MONTHLY');
    setShowModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategoryId(p.category?.id || (categories[0]?.id ?? ''));
    setDescription(p.description || '');
    setUnit(p.unit || 'unit');
    setBasePrice(p.basePrice);
    setCostPrice(p.costPrice);
    setTaxPercent(p.taxPercent || 18);
    setProductType(p.productType as any || 'ONE_TIME');
    setBillingInterval(p.billingInterval as any || 'MONTHLY');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);

    try {
      if (editingProduct) {
        await api.products.update(editingProduct.id, {
          name,
          categoryId,
          description,
          unit,
          basePrice,
          costPrice,
          taxPercent,
          productType,
          billingInterval,
        });
        setNotice(`Product '${name}' updated successfully.`);
      } else {
        await api.products.create({
          name,
          categoryId,
          description,
          unit,
          basePrice,
          costPrice,
          taxPercent,
          productType,
          billingInterval,
        });
        setNotice(`New product '${name}' created successfully.`);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-400" />
            Product Catalog Management (CRUD)
          </h1>
          <p className="text-sm text-slate-400">
            Create and edit catalog SKUs, base list prices, internal cost prices (for margin enforcement), and product billing types.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-400 text-white transition-all shadow-md shadow-brand-500/20 flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" /> Add New Product
        </button>
      </div>

      {notice && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            {notice}
          </div>
          <button onClick={() => setNotice(null)} className="text-xs underline hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Type</th>
                <th className="p-3">List Price</th>
                <th className="p-3">Cost Price</th>
                <th className="p-3">Tax %</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-bold text-white">
                    <div>{p.name}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{p.description}</div>
                  </td>
                  <td className="p-3 text-slate-300">{p.category?.name || 'General'}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.productType === 'RECURRING'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {p.productType === 'RECURRING' ? `RECURRING (${p.billingInterval})` : 'ONE_TIME'}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-white">₹{p.basePrice.toLocaleString()}</td>
                  <td className="p-3 font-mono text-slate-400">₹{p.costPrice.toLocaleString()}</td>
                  <td className="p-3 font-mono text-slate-400">{p.taxPercent}%</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-brand-400 font-bold text-xs inline-flex items-center gap-1 border border-slate-700"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Product Create / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">
                {editingProduct ? `Edit Product '${editingProduct.name}'` : 'Create New Catalog Product'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Product Name:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Category:</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-brand-500 font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Product Type:</label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value as any)}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-brand-500 font-bold"
                  >
                    <option value="ONE_TIME">ONE_TIME</option>
                    <option value="RECURRING">RECURRING</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Base Price (₹):</label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-brand-500 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Cost Price (₹):</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-brand-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Tax GST (%):</label>
                  <input
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 text-white p-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-brand-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Description:</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/20"
                >
                  {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
