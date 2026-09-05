import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Warehouse, Product, Order } from '../types';
import { Truck, MapPin, Package } from 'lucide-react';

export const FulfillmentPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [calcProductId, setCalcProductId] = useState<string>('');
  const [calcQuantity, setCalcQuantity] = useState<number>(10);
  const [allocationPreview, setAllocationPreview] = useState<any | null>(null);

  useEffect(() => {
    Promise.all([
      api.fulfillment.getWarehouses(),
      api.products.getAll(),
      api.orders.getAll(),
    ]).then(([whs, prods, ords]) => {
      setWarehouses(whs);
      setProducts(prods);
      if (prods.length > 0) setCalcProductId(prods[0].id);
      setOrders(ords);
    });
  }, []);

  // Run preview whenever quantity or product changes
  useEffect(() => {
    if (!calcProductId || calcQuantity <= 0) return;
    api.fulfillment
      .preview(calcProductId, calcQuantity)
      .then(setAllocationPreview)
      .catch((err) => console.error('Allocation preview error:', err));
  }, [calcProductId, calcQuantity]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Truck className="w-6 h-6 text-brand-400" />
          Warehouse Fulfillment & Intelligent Stock Splitting
        </h1>
        <p className="text-sm text-slate-400">
          Algorithmic multi-warehouse allocation factoring in live stock levels, replenishment limits, and shipping cost weights.
        </p>
      </div>

      {/* Warehouse Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {warehouses.map((wh) => (
          <div key={wh.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-950 border border-brand-800 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{wh.name}</h3>
                  <div className="text-xs text-slate-400 font-mono">Code: {wh.code}</div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400">Shipping Factor</span>
                <div className="text-sm font-extrabold text-brand-400 font-mono">
                  {wh.shippingCostWeight}x Weight
                </div>
              </div>
            </div>

            {/* Inventory in this warehouse */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Live Stock Levels</span>
              <div className="space-y-2">
                {wh.inventory && wh.inventory.length > 0 ? (
                  wh.inventory.map((inv) => (
                    <div
                      key={inv.productId}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-slate-200">{inv.product.name}</span>
                      <span className="font-bold font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
                        {inv.quantityAvailable} in stock
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 italic">No inventory tracked</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Fulfillment Split Simulator */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-400" />
            <h2 className="text-base font-bold text-white">Live Multi-Warehouse Allocation Simulator</h2>
          </div>
          <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            Real Backend Algorithm
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-6">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Select Hardware Product:</label>
            <select
              value={calcProductId}
              onChange={(e) => setCalcProductId(e.target.value)}
              className="w-full bg-slate-950 text-white text-xs font-semibold p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-500"
            >
              {products
                .filter((p) => p.productType === 'ONE_TIME' && p.category.name === 'Hardware')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Total available: {p.totalStock} units)
                  </option>
                ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Order Quantity:</label>
            <input
              type="number"
              min="1"
              max="50"
              value={calcQuantity}
              onChange={(e) => setCalcQuantity(parseInt(e.target.value, 10) || 1)}
              className="w-full bg-slate-950 text-white text-xs font-bold p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div className="md:col-span-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Split Result</span>
              <span className={`text-xs font-bold ${allocationPreview?.isSplit ? 'text-amber-400' : 'text-emerald-400'}`}>
                {allocationPreview?.isSplit ? 'Split Across 2 Depots' : 'Single Depot Fulfillment'}
              </span>
            </div>
          </div>
        </div>

        {/* Algorithm Recommendation Box */}
        {allocationPreview && (
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">
                Recommended Fulfillment for {allocationPreview.requestedQuantity} units of {allocationPreview.productName}:
              </span>
              <span className="text-slate-400 font-mono">
                Estimated Shipping Cost: <strong className="text-white">₹{allocationPreview.totalShippingCost.toLocaleString()}</strong> ({allocationPreview.shipmentCount} Shipments)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allocationPreview.allocations.map((alloc: any) => (
                <div key={alloc.warehouseId} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{alloc.warehouseName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-950 text-brand-300 border border-brand-800">
                      Weight: {alloc.shippingCostWeight}x
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-mono pt-1">
                    <span className="text-emerald-400 font-extrabold text-base">{alloc.quantity} units</span>
                    <span className="text-slate-400 text-xs">Shipping: ₹{alloc.shippingCost.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {allocationPreview.backorderedQuantity > 0 && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900 text-rose-300 text-xs font-medium">
                Insufficient total inventory! Remaining {allocationPreview.backorderedQuantity} units will be marked as Backordered.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmed Orders Allocations */}
      {orders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white">Confirmed Order Fulfillment Status</h2>
          <div className="space-y-3">
            {orders.map((ord) => (
              <div key={ord.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white text-sm">Order #{ord.orderNumber}</div>
                  <div className="text-slate-400">Customer: {ord.customer.companyName} • Value: ₹{ord.totalAmount.toLocaleString()}</div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md font-bold text-[11px] bg-teal-950 text-teal-300 border border-teal-800">
                    {ord.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
