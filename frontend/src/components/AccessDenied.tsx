import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Badge } from './Badge';

interface AccessDeniedProps {
  currentRole: string;
  requiredRoles?: string[];
  requestedRoute?: string;
  onGoToDashboard: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  currentRole,
  requiredRoles,
  requestedRoute,
  onGoToDashboard,
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-950/80 text-rose-400 border border-rose-800/80 mx-auto flex items-center justify-center shadow-lg shadow-rose-950/50">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Title & Headline */}
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Access Denied</h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            You don't have permission to access this page with your current role.
          </p>
        </div>

        {/* Metadata Details Card */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 text-left space-y-3 font-mono text-xs">
          {requestedRoute && (
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-500 uppercase text-[10px]">Requested Route:</span>
              <span className="font-bold text-slate-300">#{requestedRoute}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-500 uppercase text-[10px]">Current Role:</span>
            <Badge status={currentRole} type="role" />
          </div>

          {requiredRoles && requiredRoles.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-500 uppercase text-[10px]">Required Role(s):</span>
              <span className="text-amber-400 font-bold text-right text-[11px]">
                {requiredRoles.join(' / ')}
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={onGoToDashboard}
          className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Go to Dashboard
        </button>
      </div>
    </div>
  );
};
