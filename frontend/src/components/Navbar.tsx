import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLE_NAVIGATION } from '../config/navigation';
import { UserCheck, Building2, ShieldCheck, Lock } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, demoAccounts, switchUser } = useAuth();
  const role = user?.role || 'SALES_REP';
  const roleConfig = ROLE_NAVIGATION[role] || ROLE_NAVIGATION['SALES_REP'];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      {/* Top Demo Bar for Testing Role Switching */}
      <div className="bg-slate-950/90 border-b border-slate-800/80 px-6 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-400 flex items-center gap-1.5 text-[11px]">
            <UserCheck className="w-3.5 h-3.5 text-slate-500" /> [Dev Demo Switcher]:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {demoAccounts.map((acc) => {
              const isActive = user?.email === acc.email;
              return (
                <button
                  key={acc.id}
                  onClick={() => switchUser(acc.email)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                    isActive
                      ? 'bg-slate-700 text-white font-bold border border-slate-600'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {acc.name.split(' ')[0]} ({acc.role})
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user?.customerName && (
            <span className="flex items-center gap-1 text-slate-400">
              <Building2 className="w-3 h-3 text-purple-400" />
              Org: <strong className="text-white">{user.customerName}</strong>
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-brand-950 text-brand-300 border border-brand-800 tracking-wider">
            {roleConfig.roleName}
          </span>
        </div>
      </div>

      {/* Main Role Navbar */}
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Brand & Role Identifier */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center font-extrabold text-white text-sm shadow-md shadow-brand-500/20">
            DF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">DealFlow<span className="text-brand-400">360</span></span>
              {role === 'ADMIN' ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-amber-950/80 text-amber-300 border border-amber-800">
                  <ShieldCheck className="w-2.5 h-2.5 text-amber-400" /> Admin Console
                </span>
              ) : role === 'CUSTOMER' ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-purple-950 text-purple-300 border border-purple-800">
                  <Lock className="w-2.5 h-2.5" /> Customer Portal
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-slate-800 text-slate-300 border border-slate-700">
                  <ShieldCheck className="w-2.5 h-2.5 text-brand-400" /> Enterprise Workspace
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Role Navigation Tabs (Hide for ADMIN since ADMIN uses sidebar) */}
        {role !== 'ADMIN' && (
          <nav className="flex items-center gap-1">
            {roleConfig.items.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                    active
                      ? 'bg-slate-800 text-brand-400 shadow-sm border border-slate-700/80 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-brand-400' : 'text-slate-400'}`} />
                  {item.label}
                  {item.badge === 'Primary' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
};
