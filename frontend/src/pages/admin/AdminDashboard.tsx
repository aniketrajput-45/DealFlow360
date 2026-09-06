import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  Users,
  Package,
  FileText,
  ShoppingBag,
  CheckSquare,
  CreditCard,
  Clock,
  Warehouse,
  History,
  ArrowRight,
  Shield,
  DollarSign,
  Sparkles,
} from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<Props> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin
      .getStats()
      .then(setStats)
      .catch((err) => console.error('Failed to load admin stats:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-slate-100">Administration Console</h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure users, products, pricing policies, fulfillment and system activity.
        </p>
      </div>

      {/* Metrics Row 1 */}
      {loading || !stats ? (
        <div className="py-8 text-center text-slate-500 text-xs">Loading admin metrics...</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div onClick={() => onNavigate('users')} className="bg-slate-900 rounded-xl border border-slate-800 p-4 cursor-pointer hover:border-brand-500 transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Total Users</span>
                <Users className="w-4 h-4 text-brand-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono mt-1">{stats.totalUsers}</div>
            </div>

            <div onClick={() => onNavigate('customers')} className="bg-slate-900 rounded-xl border border-slate-800 p-4 cursor-pointer hover:border-indigo-500 transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Active Customers</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">{stats.activeCustomers}</div>
            </div>

            <div onClick={() => onNavigate('products')} className="bg-slate-900 rounded-xl border border-slate-800 p-4 cursor-pointer hover:border-emerald-500 transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Active Products</span>
                <Package className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">{stats.activeProducts}</div>
            </div>

            <div onClick={() => onNavigate('quotations')} className="bg-slate-900 rounded-xl border border-slate-800 p-4 cursor-pointer hover:border-purple-500 transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Active Deals</span>
                <FileText className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-400 font-mono mt-1">{stats.totalQuotations}</div>
            </div>
          </div>

          {/* Metrics Row 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div onClick={() => onNavigate('approvals')} className="bg-slate-900 rounded-xl border border-slate-800 p-4 cursor-pointer hover:border-amber-500 transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Pending Approvals</span>
                <CheckSquare className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{stats.pendingApprovals}</div>
            </div>

            <div onClick={() => onNavigate('orders')} className="bg-slate-900 rounded-xl border border-slate-800 p-4 cursor-pointer hover:border-blue-500 transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Active Orders</span>
                <ShoppingBag className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-400 font-mono mt-1">{stats.activeOrders}</div>
            </div>

            <div onClick={() => onNavigate('invoices')} className="bg-slate-900 rounded-xl border border-slate-800 p-4 cursor-pointer hover:border-teal-500 transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Outstanding Invoices</span>
                <CreditCard className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-bold text-teal-400 font-mono mt-1">{stats.outstandingInvoices}</div>
            </div>

            <div onClick={() => onNavigate('subscriptions')} className="bg-slate-900 rounded-xl border border-slate-800 p-4 cursor-pointer hover:border-pink-500 transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Active Subscriptions</span>
                <Clock className="w-4 h-4 text-pink-400" />
              </div>
              <div className="text-2xl font-bold text-pink-400 font-mono mt-1">{stats.activeSubscriptions}</div>
            </div>
          </div>
        </div>
      )}

      {/* System Shortcuts */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-base font-semibold text-slate-200 mb-4">System Administration Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div onClick={() => onNavigate('discount-governance')} className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/40 hover:border-slate-600 cursor-pointer flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-slate-200">Discount Governance</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </div>

          <div onClick={() => onNavigate('pricing')} className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/40 hover:border-slate-600 cursor-pointer flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-medium text-slate-200">Pricing Rules</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </div>

          <div onClick={() => onNavigate('warehouses')} className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/40 hover:border-slate-600 cursor-pointer flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Warehouse className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-medium text-slate-200">Warehouse Inventory</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </div>

          <div onClick={() => onNavigate('upsell')} className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/40 hover:border-slate-600 cursor-pointer flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-medium text-slate-200">Upsell Rules</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Recent System Activity */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-brand-400" /> Recent System Activity
          </h2>
          <button onClick={() => onNavigate('audit')} className="text-xs text-brand-400 hover:underline flex items-center gap-1">
            View All Audit Logs <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {stats?.recentAuditLogs && stats.recentAuditLogs.length > 0 ? (
            stats.recentAuditLogs.slice(0, 5).map((log: any) => (
              <div key={log.id} className="p-3 bg-slate-800/40 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-indigo-300 font-mono">{log.action}</span>
                  <span className="text-slate-400">Entity: <strong className="text-slate-200">{log.entity}</strong></span>
                </div>
                <span className="text-[11px] text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-xs text-slate-500">No recent audit logs found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
