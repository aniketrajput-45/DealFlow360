import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Product, ProductCategory } from '../../types';
import { Package, Layers } from 'lucide-react';

export const ProductCatalogView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  useEffect(() => {
    Promise.all([api.products.getAll(), api.products.getCategories()]).then(([prods, cats]) => {
      setProducts(prods);
      setCategories(cats);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Package className="w-6 h-6 text-brand-400" />
          Product Catalog & Category Discount Ceilings
        </h1>
        <p className="text-sm text-slate-400">Standard SKUs, list prices, costs, and category discount caps enforced by governance.</p>
      </div>

      {/* Category Ceilings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((c) => (
          <div key={c.id} className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" /> {c.name}
              </span>
              <span className="text-xs font-mono text-amber-400 font-bold">Max {c.maxDiscountPercent}% Cap</span>
            </div>
            <p className="text-xs text-slate-400">{c.description || 'Standard category rules'}</p>
          </div>
        ))}
      </div>

      {/* Products Table */}
      <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-base font-bold text-white mb-4">Product Catalog</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">SKU Code</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">List Price</th>
                <th className="p-3">Max Discount Cap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-mono text-brand-400 font-semibold">{p.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-3 font-bold text-white">{p.name}</td>
                  <td className="p-3 text-slate-300">{p.category?.name || 'General'}</td>
                  <td className="p-3 font-mono text-white font-bold">₹{p.basePrice.toLocaleString()}</td>
                  <td className="p-3 font-mono text-amber-400 font-bold">{p.category?.maxDiscountPercent || 20}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
