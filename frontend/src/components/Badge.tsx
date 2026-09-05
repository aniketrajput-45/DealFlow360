import React from 'react';

interface BadgeProps {
  status: string;
  type?: 'quote' | 'approval' | 'invoice' | 'risk' | 'role';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, type = 'quote', size = 'sm' }) => {
  const s = status?.toUpperCase() || '';
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  // Quotation Status Styles
  if (type === 'quote') {
    switch (s) {
      case 'DRAFT':
        return <span className={`inline-flex items-center rounded-md font-semibold bg-slate-800 text-slate-300 border border-slate-700 ${padding}`}>DRAFT</span>;
      case 'PENDING_APPROVAL':
        return <span className={`inline-flex items-center rounded-md font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/80 animate-pulse ${padding}`}>PENDING APPROVAL</span>;
      case 'APPROVED':
        return <span className={`inline-flex items-center rounded-md font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 ${padding}`}>APPROVED</span>;
      case 'REJECTED':
        return <span className={`inline-flex items-center rounded-md font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/80 ${padding}`}>REJECTED</span>;
      case 'NEGOTIATION':
        return <span className={`inline-flex items-center rounded-md font-semibold bg-purple-950/80 text-purple-400 border border-purple-800/80 ${padding}`}>UNDER NEGOTIATION</span>;
      case 'ACCEPTED':
        return <span className={`inline-flex items-center rounded-md font-semibold bg-teal-950/80 text-teal-300 border border-teal-800/80 ${padding}`}>ACCEPTED / CONFIRMED</span>;
      default:
        return <span className={`inline-flex items-center rounded-md font-semibold bg-slate-800 text-slate-400 ${padding}`}>{status}</span>;
    }
  }

  // Invoice Status Styles
  if (type === 'invoice') {
    switch (s) {
      case 'ISSUED':
        return <span className={`inline-flex items-center rounded-md font-semibold bg-sky-950/80 text-sky-400 border border-sky-800/80 ${padding}`}>ISSUED</span>;
      case 'PARTIALLY_PAID':
        return <span className={`inline-flex items-center rounded-md font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80 ${padding}`}>PARTIALLY PAID</span>;
      case 'PAID':
        return <span className={`inline-flex items-center rounded-md font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 ${padding}`}>PAID IN FULL</span>;
      case 'OVERDUE':
        return <span className={`inline-flex items-center rounded-md font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80 ${padding}`}>OVERDUE</span>;
      default:
        return <span className={`inline-flex items-center rounded-md font-semibold bg-slate-800 text-slate-400 ${padding}`}>{status}</span>;
    }
  }

  // Risk Score Styles
  if (type === 'risk') {
    const score = parseFloat(status) || 0;
    if (score === 0) {
      return <span className={`inline-flex items-center rounded-md font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 ${padding}`}>Risk: 0 (Low)</span>;
    } else if (score <= 20) {
      return <span className={`inline-flex items-center rounded-md font-bold bg-amber-950/80 text-amber-400 border border-amber-800/80 ${padding}`}>Risk: {score} (Moderate)</span>;
    } else {
      return <span className={`inline-flex items-center rounded-md font-bold bg-rose-950/90 text-rose-300 border border-rose-800 animate-pulse ${padding}`}>Risk: {score} (High)</span>;
    }
  }

  // Approval Level Styles
  if (type === 'approval') {
    switch (s) {
      case 'NONE':
        return <span className={`inline-flex items-center rounded-md font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 ${padding}`}>Auto-Approved (No Review)</span>;
      case 'SALES_MANAGER':
        return <span className={`inline-flex items-center rounded-md font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80 ${padding}`}>Sales Manager Required</span>;
      case 'SALES_MANAGER_AND_FINANCE':
        return <span className={`inline-flex items-center rounded-md font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80 ${padding}`}>Manager + Finance Required</span>;
      default:
        return <span className={`inline-flex items-center rounded-md font-semibold bg-slate-800 text-slate-400 ${padding}`}>{status}</span>;
    }
  }

  return <span className={`inline-flex items-center rounded-md font-semibold bg-slate-800 text-slate-300 ${padding}`}>{status}</span>;
};
