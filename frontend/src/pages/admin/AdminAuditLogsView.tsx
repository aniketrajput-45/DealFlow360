import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Search, Filter, Lock } from 'lucide-react';

interface AuditLogItem {
  id: string;
  createdAt: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string | object;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export const AdminAuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getLogs();
      setLogs(Array.isArray(res) ? (res as any) : (res as any).logs || (res as any).data || []);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const actionStr = (log.action || '').toLowerCase();
    const entityStr = (log.entity || '').toLowerCase();
    const userName = log.user?.name ? log.user.name.toLowerCase() : '';
    const userEmail = log.user?.email ? log.user.email.toLowerCase() : '';

    const matchesSearch = 
      actionStr.includes(search.toLowerCase()) ||
      entityStr.includes(search.toLowerCase()) ||
      userName.includes(search.toLowerCase()) ||
      userEmail.includes(search.toLowerCase());
    
    const matchesEntity = entityFilter === 'ALL' || entityStr.toUpperCase() === entityFilter.toUpperCase();

    return matchesSearch && matchesEntity;
  });

  const uniqueEntities = Array.from(new Set(logs.map(l => (l.entity || 'SYSTEM').toUpperCase())));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            System Audit Trail & Security Logs
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-normal rounded flex items-center gap-1">
              <Lock className="w-3 h-3" /> Append-Only Immutable
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Complete audit trail of system configuration changes, quotation approvals, status transitions, and user actions.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 mr-2" />
          <input 
            type="text"
            placeholder="Search by action, user, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-slate-200 placeholder-slate-500 text-sm focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
          <Filter className="w-4 h-4 text-slate-500 mr-2" />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-transparent text-slate-300 text-sm focus:outline-none"
          >
            <option value="ALL">All System Entities</option>
            {uniqueEntities.map(ent => (
              <option key={ent} value={ent} className="bg-slate-900 text-slate-200">
                {ent}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading system audit records...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Entity ID</th>
                  <th className="py-3.5 px-4">Details / Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-300 font-mono">
                {filteredLogs.map((log) => {
                  let detailsStr = '';
                  if (typeof log.details === 'string') {
                    detailsStr = log.details;
                  } else if (log.details) {
                    detailsStr = JSON.stringify(log.details);
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {log.user ? (
                          <div>
                            <span className="font-semibold text-slate-200">{log.user.name}</span>
                            <div className="text-slate-500">{log.user.email}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500">SYSTEM / ANONYMOUS</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-indigo-300">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                          {log.entity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {log.entityId ? `${log.entityId.substring(0, 12)}...` : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 max-w-md truncate">
                        {detailsStr || 'N/A'}
                      </td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No audit log events match selected criteria.
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
