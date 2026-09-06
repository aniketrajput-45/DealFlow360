import {
  LayoutDashboard,
  FileText,
  Kanban,
  CheckSquare,
  CreditCard,
  AlertTriangle,
  Users,
  Package,
  ShoppingBag,
  Clock,
  DollarSign,
  TrendingUp,
  Shield,
  Sparkles,
  Warehouse,
  History,
  LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

export interface RoleNavConfig {
  roleName: string;
  primaryGoal: string;
  items: NavItem[];
}

export const ROLE_NAVIGATION: Record<string, RoleNavConfig> = {
  ADMIN: {
    roleName: 'System Administrator',
    primaryGoal: 'Manage system configurations, RBAC users, product catalogs, discount governance, and audit trails',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'users', label: 'Users & Roles', icon: Users },
      { id: 'products', label: 'Products', icon: Package },
      { id: 'pricing', label: 'Pricing Rules', icon: DollarSign },
      { id: 'discount-governance', label: 'Discount Governance', icon: Shield },
      { id: 'customers', label: 'Customers', icon: Users },
      { id: 'warehouses', label: 'Warehouses & Stock', icon: Warehouse },
      { id: 'subscriptions', label: 'Subscription Plans', icon: Clock },
      { id: 'upsell', label: 'Upsell Rules', icon: Sparkles },
      { id: 'audit', label: 'Audit Logs', icon: History },
    ],
  },
  SALES_REP: {
    roleName: 'Sales Representative',
    primaryGoal: 'Create and manage sales quotations and deals',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'pipeline', label: 'My Pipeline', icon: Kanban },
      { id: 'quotations', label: 'My Quotations', icon: FileText },
      { id: 'create-quote', label: 'Create Quotation', icon: FileText, badge: 'Primary' },
      { id: 'customers', label: 'Customers', icon: Users },
      { id: 'products', label: 'Products', icon: Package },
    ],
  },
  SALES_MANAGER: {
    roleName: 'Sales Manager',
    primaryGoal: 'Review deals, approve/reject risky discounts, monitor pipeline & deal intelligence',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'pipeline', label: 'Sales Pipeline', icon: Kanban },
      { id: 'approvals', label: 'Approval Center', icon: CheckSquare },
      { id: 'health', label: 'Deal Intelligence', icon: AlertTriangle },
      { id: 'quotations', label: 'Quotations', icon: FileText },
      { id: 'team', label: 'Team Performance', icon: TrendingUp },
    ],
  },
  FINANCE: {
    roleName: 'Finance Controller',
    primaryGoal: 'Handle financial approvals, invoices, payments and recurring billing',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'approvals', label: 'Finance Approvals', icon: CheckSquare },
      { id: 'invoices', label: 'Invoices', icon: CreditCard },
      { id: 'payments', label: 'Payments', icon: DollarSign },
      { id: 'billing', label: 'Subscriptions / Billing', icon: Clock },
    ],
  },
  CUSTOMER: {
    roleName: 'Customer Portal',
    primaryGoal: 'Review quotations, negotiate terms, accept deals and track invoices',
    items: [
      { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
      { id: 'quotes', label: 'My Quotes', icon: FileText },
      { id: 'orders', label: 'Orders', icon: ShoppingBag },
      { id: 'invoices', label: 'Invoices', icon: CreditCard },
      { id: 'subscriptions', label: 'Subscriptions', icon: Clock },
      { id: 'payments', label: 'Payments', icon: DollarSign },
    ],
  },
};
