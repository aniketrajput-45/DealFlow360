import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { ArrowRight, Info, CheckCircle } from 'lucide-react';

interface UpsellRuleData {
  id: string;
  triggerProductId: string;
  triggerProduct?: {
    name: string;
  };
  recommendedProductId: string;
  recommendedProduct?: {
    name: string;
  };
  ruleType?: string;
  minMarginRequirement?: number;
  isActive?: boolean;
}

export const AdminUpsellRulesView: React.FC = () => {
  const [rules, setRules] = useState<UpsellRuleData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getUpsellRules();
      setRules(Array.isArray(res) ? res : (res as any).rules || (res as any).data || []);
    } catch (err) {
      console.error('Failed to fetch upsell rules', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Upsell & Cross-sell Governance Rules</h1>
        <p className="text-slate-400 text-sm mt-1">
          Automated recommendations and cross-selling rules suggested during quotation creation.
        </p>
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 text-blue-300 text-sm">
        <Info className="w-5 h-5 flex-shrink-0 text-blue-400 mt-0.5" />
        <div>
          <span className="font-semibold text-blue-200">System Read-Only Rule Inspection</span>
          <p className="text-xs text-blue-300/80 mt-0.5">
            Rules are evaluated in real-time by the recommendation engine based on trigger product selections, customer tier, and minimum gross margin requirements.
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
                  <th className="py-3.5 px-4 text-center">Min Margin Requirement</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-100">
                      {rule.triggerProduct?.name || `Product ID: ${rule.triggerProductId.substring(0, 8)}...`}
                    </td>
                    <td className="py-3.5 px-2 text-center text-slate-500">
                      <ArrowRight className="w-4 h-4 mx-auto text-emerald-400" />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-300">
                      {rule.recommendedProduct?.name || `Product ID: ${rule.recommendedProductId.substring(0, 8)}...`}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs">
                      {rule.minMarginRequirement ? `${rule.minMarginRequirement}%` : 'Default System Margin'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No upsell or cross-sell rules configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
