import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Building2, Search, Mail } from 'lucide-react';

interface CustomerData {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  tier: string;
  createdAt: string;
  _count?: {
    quotations: number;
    orders: number;
    subscriptions: number;
  };
}

export const AdminCustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.customers.getAll();
      setCustomers(Array.isArray(res) ? res : (res as any).data || []);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter(c => 
    c.companyName.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.contactName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Customer Master Directory</h1>
          <p className="text-slate-400 text-sm mt-1">
            System accounts, tiers, and associated transaction activity summary.
          </p>
        </div>
      </div>

      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 max-w-md">
        <Search className="w-4 h-4 text-slate-500 mr-2" />
        <input 
          type="text"
          placeholder="Search by company, contact, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent text-slate-200 placeholder-slate-500 text-sm focus:outline-none w-full"
        />
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading customer database...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Company</th>
                  <th className="py-3.5 px-4">Primary Contact</th>
                  <th className="py-3.5 px-4">Customer Tier</th>
                  <th className="py-3.5 px-4 text-center">Quotations</th>
                  <th className="py-3.5 px-4 text-center">Orders</th>
                  <th className="py-3.5 px-4 text-center">Subscriptions</th>
                  <th className="py-3.5 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100">{c.companyName}</div>
                          <div className="text-xs text-slate-500 font-mono">ID: {c.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">{c.contactName || 'N/A'}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        {c.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {(() => {
                        const tierName = typeof c.tier === 'object' && c.tier ? (c.tier as any).name : c.tier || 'STANDARD';
                        return (
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                            tierName === 'GOLD' || tierName === 'PLATINUM' 
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : tierName === 'SILVER'
                              ? 'bg-slate-500/10 text-slate-300 border-slate-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {tierName}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium">
                      <span className="inline-flex items-center px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded">
                        {c._count?.quotations ?? '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium">
                      <span className="inline-flex items-center px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded">
                        {c._count?.orders ?? '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium">
                      <span className="inline-flex items-center px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded">
                        {c._count?.subscriptions ?? '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No customer accounts found matching search criteria.
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
