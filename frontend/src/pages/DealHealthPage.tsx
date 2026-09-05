import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DealHealthAlerts } from '../types';
import {
  Clock,
  TrendingDown,
  Bell,
  CheckCircle2,
  Activity,
} from 'lucide-react';

export const DealHealthPage: React.FC = () => {
  const [alerts, setAlerts] = useState<DealHealthAlerts | null>(null);
  const [overview, setOverview] = useState<any | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadHealthData = () => {
    Promise.all([api.reporting.getHealth(), api.reporting.getOverview()]).then(([health, ov]) => {
      setAlerts(health);
      setOverview(ov);
    });
  };

  useEffect(() => {
    loadHealthData();
  }, []);

  const handleNudge = async (quoteId: string, type: string) => {
    try {
      await api.reporting.nudge(quoteId, type, 'Automated alert trigger from Deal Health Dashboard');
      setActionFeedback(`Alert action '${type}' dispatched successfully to responsible rep.`);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Activity className="w-6 h-6 text-brand-400" />
          Deal Health & Anomaly Surveillance
        </h1>
        <p className="text-sm text-slate-400">
          Deterministic surveillance of stalled quotations, rep discount anomalies, and fulfillment slippage.
        </p>
      </div>

      {actionFeedback && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          {actionFeedback}
        </div>
      )}

      {/* KPI Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pipeline Exposure</span>
            <div className="text-2xl font-extrabold text-white font-mono">
              ₹{overview.metrics.pipelineValue.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">{overview.metrics.totalQuotesCount} active quotations</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Confirmed Revenue</span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              ₹{overview.metrics.totalSales.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">{overview.metrics.activeOrdersCount} confirmed orders</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Collections Received</span>
            <div className="text-2xl font-extrabold text-teal-300 font-mono">
              ₹{overview.metrics.totalCollected.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">Reconciled in database</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Outstanding AR</span>
            <div className="text-2xl font-extrabold text-rose-400 font-mono">
              ₹{overview.metrics.outstandingReceivables.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">Due across issued invoices</div>
          </div>
        </div>
      )}

      {/* Anomalies and Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Stalled Deals */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Stalled Deals Alert</h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-950 text-amber-300 border border-amber-800">
              {alerts?.stalledDeals.length || 0} Deals Stalled
            </span>
          </div>

          <div className="space-y-3">
            {alerts?.stalledDeals.map((deal) => (
              <div key={deal.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-white text-xs block">{deal.customerName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{deal.quoteNumber} • Rep: {deal.repName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-950 text-rose-300 border border-rose-800">
                    {deal.daysInactive} Days Inactive
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                  <span className="font-bold font-mono text-white">₹{deal.totalAmount.toLocaleString()}</span>
                  <button
                    onClick={() => handleNudge(deal.id, 'NUDGE_REP')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Bell className="w-3 h-3" /> Nudge Sales Rep
                  </button>
                </div>
              </div>
            ))}

            {alerts?.stalledDeals.length === 0 && (
              <div className="py-10 text-center text-slate-500 text-xs italic">
                All active quotations have been engaged recently. No stalled deals detected.
              </div>
            )}
          </div>
        </div>

        {/* 2. Discount Anomalies */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Discount Anomaly Alerts</h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-950 text-rose-300 border border-rose-800">
              {alerts?.discountAnomalies.length || 0} Anomalies Detected
            </span>
          </div>

          <div className="space-y-3">
            {alerts?.discountAnomalies.map((anom) => (
              <div key={anom.id} className="p-3.5 rounded-xl bg-slate-950 border border-rose-950/60 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-white text-xs block">{anom.customerName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{anom.quoteNumber} • Rep: {anom.repName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-950 text-rose-300 border border-rose-800">
                    {anom.quoteDiscountPercent}% Applied ({anom.excessFactor}x Rep Avg)
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">{anom.recommendation}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                  <span className="font-bold font-mono text-white">₹{anom.totalAmount.toLocaleString()}</span>
                  <button
                    onClick={() => handleNudge(anom.id, 'ESCALATE_TO_MANAGER')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-sm"
                  >
                    Escalate to Manager
                  </button>
                </div>
              </div>
            ))}

            {alerts?.discountAnomalies.length === 0 && (
              <div className="py-10 text-center text-slate-500 text-xs italic">
                All deal discounts are within historical distribution patterns.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
