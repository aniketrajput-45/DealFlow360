import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Users, CheckCircle2 } from 'lucide-react';

export const AdminUsersView: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadUsers = () => {
    api.admin.getUsers().then(setUsers);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    setNotice(null);
    try {
      await api.admin.updateUserRole(userId, newRole);
      setNotice(`User role updated to ${newRole} successfully.`);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const rolesList = ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE', 'CUSTOMER'];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-400" />
            Users & Role Management (RBAC)
          </h1>
          <p className="text-sm text-slate-400">
            View system user accounts, inspect account creation dates, and reassign user roles (ADMIN, SALES_REP, SALES_MANAGER, FINANCE, CUSTOMER).
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
        >
          Refresh Users
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
                <th className="p-3">User Name</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Customer Org</th>
                <th className="p-3">Created Date</th>
                <th className="p-3">Assigned Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-bold text-white flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-brand-400 font-extrabold flex items-center justify-center border border-slate-700 text-xs">
                      {u.name.charAt(0)}
                    </div>
                    {u.name}
                  </td>
                  <td className="p-3 font-mono text-slate-300">{u.email}</td>
                  <td className="p-3 text-slate-400">{u.customerName || 'Internal Enterprise Staff'}</td>
                  <td className="p-3 font-mono text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      disabled={updatingId === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-slate-950 text-white font-mono text-xs p-2 rounded-lg border border-slate-700 focus:outline-none focus:border-brand-500 font-bold"
                    >
                      {rolesList.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
