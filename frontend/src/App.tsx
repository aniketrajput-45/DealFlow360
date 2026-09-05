import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AdminSidebar } from './components/AdminSidebar';

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

function AppContent() {
  const { user } = useAuth();
  const role = user?.role || 'SALES_REP';
  // Initialize currentTab from window.location.hash or fallback to 'dashboard'
  const [currentTab, setCurrentTab] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'dashboard';
  });

  // Keep URL hash in sync with currentTab and handle browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setCurrentTab(hash);
      } else {
        setCurrentTab('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update hash & history when user changes tab
  const handleSetCurrentTab = (tab: string) => {
    setCurrentTab(tab);
    if (window.location.hash !== `#${tab}`) {
      window.history.pushState(null, '', `#${tab}`);
    }
  };

  // Reset tab to role's landing dashboard whenever user/role switches
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash || hash === 'dashboard') {
      handleSetCurrentTab('dashboard');
    }
  }, [role, user?.email]);

  const handleNavigate = (tab: string) => {
    handleSetCurrentTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-brand-500 selection:text-white">
      <Navbar currentTab={currentTab} setCurrentTab={handleSetCurrentTab} />

      <div className={`flex-1 max-w-7xl w-full mx-auto px-6 py-6 ${role === 'ADMIN' ? 'flex gap-6' : ''}`}>
        {role === 'ADMIN' && (
          <AdminSidebar currentTab={currentTab} setCurrentTab={handleSetCurrentTab} />
        )}

        <main className="flex-1 pb-16 min-w-0">
          {/* Main Landing Dashboard for any role */}
          {currentTab === 'dashboard' && <RoleDashboard onNavigate={handleNavigate} />}

          {/* Common & Role Specific Views */}
          {currentTab === 'pipeline' && <PipelineKanbanPage />}
          {currentTab === 'quotations' && <QuotationsListView />}
          {currentTab === 'create-quote' && <QuoteBuilderPage onQuoteCreated={() => setCurrentTab('pipeline')} />}
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
