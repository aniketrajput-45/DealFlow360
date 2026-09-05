import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Kanban,
  CheckSquare,
  Truck,
  CreditCard,
  AlertTriangle,
  UserCheck,
  Building2,
  Lock,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, demoAccounts, switchUser, isCustomer } = useAuth();

  const sellerNav = [
    { id: 'builder', label: 'Quotation Builder', icon: FileText },
    { id: 'pipeline', label: 'Deal Pipeline', icon: Kanban },
    { id: 'approvals', label: 'Approvals Queue', icon: CheckSquare },
    { id: 'fulfillment', label: 'Warehouse Fulfillment', icon: Truck },
    { id: 'billing', label: 'Invoices & Billing', icon: CreditCard },
    { id: 'health', label: 'Deal Health & Alerts', icon: AlertTriangle },
  ];

  const customerNav = [
    { id: 'portal', label: 'Customer Portal & Negotiations', icon: Building2 },
    { id: 'billing', label: 'My Invoices & Payments', icon: CreditCard },
  ];

  const navItems = isCustomer ? customerNav : sellerNav;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      {/* Top Demo Context Bar */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 px-6 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-brand-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" /> Fast Role Switcher:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {demoAccounts.map((acc) => {
              const isActive = user?.email === acc.email;
              return (
                <button
                  key={acc.id}
                  onClick={() => switchUser(acc.email)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/50'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
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
              <Building2 className="w-3 h-3 text-brand-400" />
              Org: <strong className="text-white">{user.customerName}</strong>
            </span>
          )}
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center font-extrabold text-white text-base shadow-md shadow-brand-500/20">
            DF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">DealFlow<span className="text-brand-400">360</span></span>
              {isCustomer ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-purple-950 text-purple-300 border border-purple-800">
                  <Lock className="w-2.5 h-2.5" /> Customer Portal
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-brand-950 text-brand-300 border border-brand-800/80">
                  Seller Workspace
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-slate-800 text-brand-400 shadow-sm border border-slate-700/80'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-brand-400' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
