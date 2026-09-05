import React from 'react';
import {
  LayoutDashboard,
  Package,
  DollarSign,
  Shield,
  Users,
  Warehouse,
  Clock,
  Sparkles,
  History,
  ChevronRight,
} from 'lucide-react';

interface AdminSidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

interface NavGroup {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ElementType;
  }[];
}

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'SALES CONFIGURATION',
    items: [
      { id: 'products', label: 'Products Catalog', icon: Package },
      { id: 'pricing', label: 'Pricing Rules', icon: DollarSign },
      { id: 'discount-governance', label: 'Discount Governance', icon: Shield },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { id: 'customers', label: 'Customers Directory', icon: Users },
      { id: 'warehouses', label: 'Warehouses & Stock', icon: Warehouse },
      { id: 'subscriptions', label: 'Subscription Plans', icon: Clock },
      { id: 'upsell', label: 'Upsell / Cross-sell', icon: Sparkles },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'users', label: 'Users & Roles', icon: Users },
      { id: 'audit', label: 'Audit Logs', icon: History },
    ],
  },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentTab, setCurrentTab }) => {
  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900/90 border-r border-slate-800 p-4 min-h-[calc(100vh-5rem)] rounded-xl">
      <div className="mb-6 px-3 py-2 border-b border-slate-800">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Admin Console</h2>
        <p className="text-[11px] text-slate-400 mt-0.5">System Administration</p>
      </div>

      <nav className="space-y-6">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <h3 className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {group.title}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${active ? 'text-brand-400' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {active && <ChevronRight className="w-3.5 h-3.5 text-brand-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};
