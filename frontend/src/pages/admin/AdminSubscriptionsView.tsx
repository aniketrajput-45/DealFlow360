import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { RefreshCw, Package, CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react';
import { Subscription } from '../../types';

export const AdminSubscriptionsView: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.billing.getSubscriptions();
      setSubscriptions(Array.isArray(res) ? res : (res as any).data || []);
    } catch (err: any) {
      console.error('Failed to fetch subscriptions:', err);
      setError(err.message || 'Failed to load subscriptions data from server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Subscription Plans Governance</h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure users, products, pricing policies, fulfillment and system activity.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading subscription records...</div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <p className="font-semibold">Error Loading Subscriptions</p>
          <p className="text-xs text-red-300/80 mt-1">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptions.map((sub) => {
            const intervalLabel = sub.billingInterval
              ? sub.billingInterval.toLowerCase()
              : 'recurring';

            let statusBadge = (
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            );

            if (sub.status === 'PAUSED') {
              statusBadge = (
                <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/20 flex items-center gap-1">
                  <PauseCircle className="w-3 h-3" /> Paused
                </span>
              );
            } else if (sub.status === 'CANCELLED' || sub.status === 'EXPIRED') {
              statusBadge = (
                <span className="px-2.5 py-1 bg-red-500/10 text-red-400 text-xs font-semibold rounded-full border border-red-500/20 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {sub.status}
                </span>
              );
            }

            return (
              <div key={sub.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    {statusBadge}
                  </div>
                  <h2 className="text-lg font-bold text-slate-100">{sub.product?.name || 'Subscription Package'}</h2>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Customer: <span className="font-semibold text-slate-300">{sub.customer?.companyName || 'Enterprise'}</span>
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Recurring Amount</span>
                    <span className="text-2xl font-extrabold text-slate-100">
                      ${Number(sub.unitPrice * sub.quantity).toLocaleString()}
                      <span className="text-xs font-normal text-slate-400">/{intervalLabel}</span>
                    </span>
                  </div>
                  {sub.product && (
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                      <Package className="w-3.5 h-3.5 text-slate-500" />
                      Product SKU: <span className="text-slate-200 font-medium">{sub.product.name}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {subscriptions.length === 0 && (
            <div className="col-span-full p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
              No active subscription plans defined in system.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
