import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { QuoteBuilderPage } from './pages/QuoteBuilderPage';
import { PipelineKanbanPage } from './pages/PipelineKanbanPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { FulfillmentPage } from './pages/FulfillmentPage';
import { BillingPage } from './pages/BillingPage';
import { DealHealthPage } from './pages/DealHealthPage';
import { CustomerPortalPage } from './pages/CustomerPortalPage';

function AppContent() {
  const { isCustomer } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('builder');

  // If switched to Customer role, default tab to 'portal'
  React.useEffect(() => {
    if (isCustomer) {
      setCurrentTab('portal');
    } else if (currentTab === 'portal') {
      setCurrentTab('builder');
    }
  }, [isCustomer]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-brand-500 selection:text-white">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 pb-16">
        {currentTab === 'builder' && <QuoteBuilderPage onQuoteCreated={() => setCurrentTab('pipeline')} />}
        {currentTab === 'pipeline' && <PipelineKanbanPage />}
        {currentTab === 'approvals' && <ApprovalsPage />}
        {currentTab === 'fulfillment' && <FulfillmentPage />}
        {currentTab === 'billing' && <BillingPage />}
        {currentTab === 'health' && <DealHealthPage />}
        {currentTab === 'portal' && <CustomerPortalPage />}
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
