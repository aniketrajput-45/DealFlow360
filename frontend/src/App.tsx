import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';

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

function AppContent() {
  const { user } = useAuth();
  const role = user?.role || 'SALES_REP';
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Reset tab to role's landing dashboard whenever user/role switches
  useEffect(() => {
    setCurrentTab('dashboard');
  }, [role, user?.email]);

  const handleNavigate = (tab: string) => {
    setCurrentTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-brand-500 selection:text-white">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 pb-16 max-w-7xl w-full mx-auto px-6 py-6">
        {/* Main Landing Dashboard for any role */}
        {currentTab === 'dashboard' && <RoleDashboard onNavigate={handleNavigate} />}

        {/* Common & Role Specific Views */}
        {currentTab === 'pipeline' && <PipelineKanbanPage />}
        {currentTab === 'quotations' && <QuotationsListView />}
        {currentTab === 'create-quote' && <QuoteBuilderPage onQuoteCreated={() => setCurrentTab('pipeline')} />}
        {currentTab === 'customers' && <CustomerListView />}
        {currentTab === 'products' && <ProductCatalogView />}
        {currentTab === 'approvals' && <ApprovalsPage />}
        {currentTab === 'health' && <DealHealthPage />}
        {currentTab === 'team' && <TeamPerformanceView />}
        {currentTab === 'invoices' && <BillingPage defaultSubTab="invoices" />}
        {currentTab === 'payments' && <BillingPage defaultSubTab="invoices" />}
        {currentTab === 'billing' && <BillingPage defaultSubTab="subscriptions" />}
        {currentTab === 'subscriptions' && <BillingPage defaultSubTab="subscriptions" />}
        {currentTab === 'quotes' && <CustomerPortalPage />}
        {currentTab === 'orders' && <CustomerPortalPage />}
      </main>
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
