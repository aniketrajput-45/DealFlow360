import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Warehouse, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface WarehouseData {
  id: string;
  name: string;
  code?: string;
  address?: string;
  shippingCostWeight?: number;
  inventory?: Array<{
    id: string;
    quantityAvailable: number;
    reorderLevel: number;
    product: {
      id: string;
      name: string;
      category?: {
        id: string;
        name: string;
      };
    };
  }>;
}

export const AdminInventoryView: React.FC = () => {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await api.warehouses.list();
      setWarehouses(Array.isArray(res) ? res : (res as any).data || []);
    } catch (err) {
      console.error('Failed to fetch warehouse inventory', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Warehouses & Stock Governance</h1>
        <p className="text-slate-400 text-sm mt-1">
          System-wide warehouse stock levels, available vs reserved quantities, and health metrics.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading warehouse inventory data...</div>
      ) : (
        <div className="space-y-6">
          {warehouses.map((wh) => {
            const inventoryList = wh.inventory || [];
            return (
              <div key={wh.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                      <Warehouse className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">{wh.name}</h2>
                      <p className="text-xs text-slate-400">
                        Code: {wh.code || 'MAIN'} | Address: {wh.address || 'Central Distribution Facility'}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold rounded-full">
                    {inventoryList.length} Products Tracked
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-900 border-b border-slate-800">
                      <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Available Qty</th>
                        <th className="py-2.5 px-3 text-right">Reorder Threshold</th>
                        <th className="py-2.5 px-3 text-center">Stock Health</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                      {inventoryList.length > 0 ? (
                        inventoryList.map((inv) => {
                          const available = inv.quantityAvailable ?? 0;
                          const reorder = inv.reorderLevel ?? 5;
                          let statusBadge = (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
                              <CheckCircle className="w-3 h-3" /> Healthy Stock
                            </span>
                          );
                          if (available === 0) {
                            statusBadge = (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-full border border-red-500/20">
                                <XCircle className="w-3 h-3" /> Out of Stock
                              </span>
                            );
                          } else if (available <= reorder) {
                            statusBadge = (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-full border border-amber-500/20">
                                <AlertTriangle className="w-3 h-3" /> Low Stock Warning
                              </span>
                            );
                          }

                          const categoryName = inv.product?.category?.name || 'General';

                          return (
                            <tr key={inv.id} className="hover:bg-slate-800/30">
                              <td className="py-3 px-3 font-semibold text-slate-200">
                                {inv.product?.name || 'Unknown Product'}
                              </td>
                              <td className="py-3 px-3 text-xs text-slate-400">
                                {categoryName}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-100">
                                {available}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-slate-400">
                                {reorder}
                              </td>
                              <td className="py-3 px-3 text-center">
                                {statusBadge}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-500 text-sm">
                            No stock records allocated to this warehouse.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {warehouses.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              No warehouses found in system.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
