import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AdminSidebar } from './components/AdminSidebar';
import { AccessDenied } from './components/AccessDenied';

// Dashboards
import { RoleDashboard } from './pages/dashboards/RoleDashboard';

// Specialized views & pages
import { QuoteBuilderPage } from './pages/QuoteBuilderPage';
import { PipelineKanbanPage } from './pages/PipelineKanbanPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { BillingPage } from './pages/BillingPage';
import { DealHealthPage } from './pages/DealHealthPage';
import { CustomerPortalPage } from './pages/CustomerPortalPage';
import { CustomerListView } from './pages/views/CustomerListView';
import { ProductCatalogView } from './pages/views/ProductCatalogView';
import { QuotationsListView } from './pages/views/QuotationsListView';
import { TeamPerformanceView } from './pages/views/TeamPerformanceView';

import { AdminUsersView } from './pages/admin/AdminUsersView';
import { AdminProductsView } from './pages/admin/AdminProductsView';
import { AdminPricingView } from './pages/admin/AdminPricingView';
import { AdminDiscountGovernanceView } from './pages/admin/AdminDiscountGovernanceView';
import { AdminCustomersView } from './pages/admin/AdminCustomersView';
import { AdminInventoryView } from './pages/admin/AdminInventoryView';
import { AdminSubscriptionsView } from './pages/admin/AdminSubscriptionsView';
import { AdminUpsellRulesView } from './pages/admin/AdminUpsellRulesView';
import { AdminAuditLogsView } from './pages/admin/AdminAuditLogsView';
import { LoginPage } from './pages/LoginPage';

// Explicit Route-Permission Guard Matrix
const ROUTE_ALLOWED_ROLES: Record<string, string[]> = {
  dashboard: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE', 'CUSTOMER'],
  // Sales Rep / Shared Sales
  pipeline: ['ADMIN', 'SALES_REP', 'SALES_MANAGER'],
  quotations: ['ADMIN', 'SALES_REP', 'SALES_MANAGER'],
  'create-quote': ['ADMIN', 'SALES_REP'],
  customers: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE'],
  products: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE'],
  // Manager Only / Specific
  approvals: ['ADMIN', 'SALES_MANAGER', 'FINANCE'],
  health: ['ADMIN', 'SALES_MANAGER'],
  team: ['ADMIN', 'SALES_MANAGER'],
  // Finance
  invoices: ['ADMIN', 'FINANCE', 'CUSTOMER'],
  payments: ['ADMIN', 'FINANCE', 'CUSTOMER'],
  billing: ['ADMIN', 'FINANCE'],
  subscriptions: ['ADMIN', 'FINANCE', 'CUSTOMER'],
  // Customer Portal
  quotes: ['CUSTOMER'],
  orders: ['CUSTOMER'],
  // Admin Only Console Tabs
  users: ['ADMIN'],
  pricing: ['ADMIN'],
  'discount-governance': ['ADMIN'],
  warehouses: ['ADMIN'],
  upsell: ['ADMIN'],
  audit: ['ADMIN'],
};

function AppContent() {
  const { user, loading } = useAuth();

  // Helper: validate if a given tab is permitted for a role
  const isTabAllowedForRole = (tabName: string, roleName: string): boolean => {
    if (!roleName) return false;
    const allowedRoles = ROUTE_ALLOWED_ROLES[tabName];
    if (!allowedRoles) return false;
    return allowedRoles.includes(roleName);
  };

  // State initialized dynamically from URL hash
  const [currentTab, setCurrentTab] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'dashboard';
  });

  // Reactive Hash Change Listener
  useEffect(() => {
    if (!user) return;

    const handleHashSync = () => {
      const hash = window.location.hash.replace('#', '');
      const targetHash = hash || 'dashboard';
      const role = user.role;
      const allowed = isTabAllowedForRole(targetHash, role);

      console.log(`[RBAC Route Sync] Role: '${role}' | Requested Hash: '#${targetHash}' | Allowed: ${allowed}`);
      setCurrentTab(targetHash);
    };

    // Run initial sync on user load/role change
    handleHashSync();

    // Listen to hash changes (manual paste, link clicks, back/forward, location.hash = ...)
    window.addEventListener('hashchange', handleHashSync);
    window.addEventListener('popstate', handleHashSync);

    return () => {
      window.removeEventListener('hashchange', handleHashSync);
      window.removeEventListener('popstate', handleHashSync);
    };
  }, [user?.role, user?.id]);

  const handleSetCurrentTab = (tab: string) => {
    setCurrentTab(tab);
    if (window.location.hash !== `#${tab}`) {
      window.history.pushState(null, '', `#${tab}`);
    }
  };

  const handleNavigate = (tab: string) => {
    handleSetCurrentTab(tab);
  };

  const handleGoToDashboard = () => {
    handleSetCurrentTab('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400 text-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mb-3"></div>
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const role = user.role;
  const isCurrentTabAllowed = isTabAllowedForRole(currentTab, role);
  const requiredRoles = ROUTE_ALLOWED_ROLES[currentTab];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-brand-500 selection:text-white">
      <Navbar currentTab={currentTab} setCurrentTab={handleSetCurrentTab} />

      <div className={`flex-1 max-w-7xl w-full mx-auto px-6 py-6 ${role === 'ADMIN' ? 'flex gap-6' : ''}`}>
        {role === 'ADMIN' && (
          <AdminSidebar currentTab={currentTab} setCurrentTab={handleSetCurrentTab} />
        )}

        <main className="flex-1 pb-16 min-w-0">
          {!isCurrentTabAllowed ? (
            <AccessDenied
              currentRole={role}
              requiredRoles={requiredRoles}
              requestedRoute={currentTab}
              onGoToDashboard={handleGoToDashboard}
            />
          ) : (
            <>
              {/* Main Landing Dashboard for any role */}
              {currentTab === 'dashboard' && <RoleDashboard onNavigate={handleNavigate} />}

              {/* Common & Role Specific Views */}
              {currentTab === 'pipeline' && <PipelineKanbanPage />}
              {currentTab === 'quotations' && <QuotationsListView />}
              {currentTab === 'create-quote' && <QuoteBuilderPage onQuoteCreated={() => handleSetCurrentTab('pipeline')} />}
              {currentTab === 'customers' && (role === 'ADMIN' ? <AdminCustomersView /> : <CustomerListView />)}
              {currentTab === 'products' && (role === 'ADMIN' ? <AdminProductsView /> : <ProductCatalogView />)}
              {currentTab === 'approvals' && <ApprovalsPage />}
              {currentTab === 'health' && <DealHealthPage />}
              {currentTab === 'team' && <TeamPerformanceView />}
              {currentTab === 'invoices' && <BillingPage defaultSubTab="invoices" />}
              {currentTab === 'payments' && <BillingPage defaultSubTab="invoices" />}
              {currentTab === 'billing' && <BillingPage defaultSubTab="subscriptions" />}
              {currentTab === 'subscriptions' && (role === 'ADMIN' ? <AdminSubscriptionsView /> : <BillingPage defaultSubTab="subscriptions" />)}
              {currentTab === 'quotes' && <CustomerPortalPage />}
              {currentTab === 'orders' && <CustomerPortalPage />}

              {/* Admin Workspace Specific Tabs */}
              {currentTab === 'users' && <AdminUsersView />}
              {currentTab === 'pricing' && <AdminPricingView />}
              {currentTab === 'discount-governance' && <AdminDiscountGovernanceView />}
              {currentTab === 'warehouses' && <AdminInventoryView />}
              {currentTab === 'upsell' && <AdminUpsellRulesView />}
              {currentTab === 'audit' && <AdminAuditLogsView />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
