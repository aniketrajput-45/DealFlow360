import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { SalesRepDashboard } from './SalesRepDashboard';
import { SalesManagerDashboard } from './SalesManagerDashboard';
import { FinanceDashboard } from './FinanceDashboard';
import { CustomerDashboard } from './CustomerDashboard';

interface Props {
  onNavigate: (tab: string) => void;
}

export const RoleDashboard: React.FC<Props> = ({ onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'SALES_REP';

  switch (role) {
    case 'SALES_MANAGER':
      return <SalesManagerDashboard onNavigate={onNavigate} />;
    case 'FINANCE':
      return <FinanceDashboard onNavigate={onNavigate} />;
    case 'CUSTOMER':
      return <CustomerDashboard onNavigate={onNavigate} />;
    case 'SALES_REP':
    default:
      return <SalesRepDashboard onNavigate={onNavigate} />;
  }
};
