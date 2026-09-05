import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Approval } from '../types';
import { Badge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, CheckCircle2, XCircle, AlertCircle, ShieldAlert, History } from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadApprovals = () => {
    api.approvals
      .getAll('PENDING')
      .then((data) => {
        setApprovals(data);
        if (data.length > 0 && !selectedApproval) {
          setSelectedApproval(data[0]);
        } else if (selectedApproval) {
          const refreshed = data.find((d) => d.id === selectedApproval.id);
          setSelectedApproval(refreshed || data[0] || null);
        }
      });
  };

  useEffect(() => {
    loadApprovals();
  }, [user]);

  const handleAction = async (action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES') => {
    if (!selectedApproval || processing) return;
    if (action !== 'APPROVE' && !actionReason.trim()) {
      alert('Please provide a reason or note for this decision.');
      return;
    }

    setProcessing(true);
    setFeedback(null);
    try {
      const res = await api.approvals.takeAction(selectedApproval.id, action, actionReason);
      setFeedback({ type: 'success', text: res.message });
      setActionReason('');
      
      // Fetch fresh approvals and update currently selected item
      const freshData = await api.approvals.getAll('PENDING');
      setApprovals(freshData);
      const refreshedItem = freshData.find((d) => d.id === selectedApproval.id);
      setSelectedApproval(refreshedItem || freshData[0] || null);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to process approval.' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-brand-400" />
            Discount Governance & Approval Queue
          </h1>
          <p className="text-sm text-slate-400">
            Review and decide on quotations flagged for discount overages and blended margin risk.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400">Acting as:</span>
          <span className="font-bold text-white">{user?.name}</span>
          <Badge status={user?.role || ''} type="role" />
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm flex items-center justify-between shadow-lg ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/80 border border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {feedback.text}
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs underline hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Grid: Pending List on Left, Active Review on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Pending Approvals ({approvals.length})
            </span>
            <button onClick={loadApprovals} className="text-xs text-brand-400 hover:underline">
              Refresh
            </button>
          </div>

          {approvals.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-500 text-xs">
              No pending quotations require your approval at this time.
            </div>
          ) : (
            approvals.map((app) => {
              const isSelected = selectedApproval?.id === app.id;
              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedApproval(app)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-brand-500 shadow-md ring-1 ring-brand-500/20'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <div className="font-bold text-white text-xs">{app.quotation?.customer?.companyName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{app.quotation?.quoteNumber}</div>
                    </div>
                    <Badge status={String(app.riskScore)} type="risk" />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
                    <span className="font-bold text-white font-mono">₹{app.quotation?.totalAmount.toLocaleString()}</span>
                    <Badge status={app.approvalLevel} type="approval" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Selected Quotation Governance Audit */}
        <div className="lg:col-span-7">
          {selectedApproval ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{selectedApproval.quotation?.customer?.companyName}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                      {selectedApproval.quotation?.customer?.tier.name} Tier
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 font-mono">
                    Quote Ref: {selectedApproval.quotation?.quoteNumber} • Submitted by {selectedApproval.quotation?.createdBy?.name}
                  </div>
                </div>

                <Badge status={selectedApproval.approvalLevel} type="approval" />
              </div>

              {/* Risk Banner */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Governance Violation Reason:
                  </span>
                  <Badge status={String(selectedApproval.riskScore)} type="risk" />
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedApproval.reason}</p>
              </div>

              {/* Item Lines Audit */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Line Items Under Review</h3>
                <div className="space-y-2">
                  {selectedApproval.quotation?.items.map((item) => {
                    const isExceeded = (item.riskPoints || 0) > 0;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          isExceeded
                            ? 'bg-rose-950/20 border-rose-900/40 text-rose-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white">{item.product?.name}</div>
                          <div className="text-[11px] text-slate-400">
                            Qty: {item.quantity} • Unit Price: ₹{item.unitPrice.toLocaleString()}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`font-mono font-bold ${isExceeded ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {item.discountPercent}% Discount {isExceeded && `(+${item.riskPoints}% over limit)`}
                          </div>
                          <div className="font-mono text-white font-semibold">₹{item.lineTotal.toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-[11px] text-slate-400">Subtotal</div>
                  <div className="text-sm font-bold text-white font-mono">
                    ₹{selectedApproval.quotation?.subtotal.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Discount Given</div>
                  <div className="text-sm font-bold text-rose-400 font-mono">
                    -₹{selectedApproval.quotation?.discountAmount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Net Deal Value</div>
                  <div className="text-sm font-bold text-brand-400 font-mono">
                    ₹{selectedApproval.quotation?.totalAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Multi-Level Stage Tracker */}
              {selectedApproval.approvalLevel === 'SALES_MANAGER_AND_FINANCE' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Multi-Level Governance Approval Progress
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {(() => {
                      const mgrAction = selectedApproval.actions?.find(
                        (a) => a.user?.role?.name === 'SALES_MANAGER' || a.user?.role?.name === 'ADMIN'
                      );
                      const isMgrApproved = mgrAction?.action === 'APPROVE';
                      const isMgrRejected = mgrAction?.action === 'REJECT';

                      return (
                        <>
                          <div
                            className={`p-3 rounded-lg border flex items-center justify-between ${
                              isMgrApproved
                                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                                : isMgrRejected
                                ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <div>
                              <div className="font-bold">1. Sales Manager Review</div>
                              <div className="text-[10px]">
                                {isMgrApproved
                                  ? `Approved by ${mgrAction?.user?.name}`
                                  : isMgrRejected
                                  ? `Rejected by ${mgrAction?.user?.name}`
                                  : 'Pending Review ⏳'}
                              </div>
                            </div>
                            <span className="font-bold font-mono">
                              {isMgrApproved ? '✓ Approved' : isMgrRejected ? '✗ Rejected' : '⏳ Pending'}
                            </span>
                          </div>

                          <div
                            className={`p-3 rounded-lg border flex items-center justify-between ${
                              selectedApproval.status === 'APPROVED'
                                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                                : selectedApproval.status === 'REJECTED'
                                ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                                : isMgrApproved
                                ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                                : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60'
                            }`}
                          >
                            <div>
                              <div className="font-bold">2. Finance Review</div>
                              <div className="text-[10px]">
                                {selectedApproval.status === 'APPROVED'
                                  ? 'Approved ✓'
                                  : isMgrApproved
                                  ? 'Awaiting Finance Review ⏳'
                                  : 'Awaiting Manager Review First'}
                              </div>
                            </div>
                            <span className="font-bold font-mono">
                              {selectedApproval.status === 'APPROVED'
                                ? '✓ Approved'
                                : isMgrApproved
                                ? '⏳ Pending'
                                : 'Locked'}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Audit History */}
              {selectedApproval.actions && selectedApproval.actions.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <History className="w-3.5 h-3.5" /> Previous Review Actions
                  </div>
                  <div className="space-y-1.5">
                    {selectedApproval.actions.map((act) => (
                      <div key={act.id} className="p-2.5 rounded-lg bg-slate-950 text-xs border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white">{act.user.name}</span>{' '}
                          <span className="text-slate-400">({act.user.role.name})</span>: {act.reason || 'No note'}
                        </div>
                        <Badge status={act.action} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Controls */}
              {selectedApproval.canAct === false ? (
                <div className="pt-4 border-t border-slate-800 text-center p-3 bg-slate-950/60 rounded-xl text-slate-400 text-xs border border-slate-800">
                  {selectedApproval.approvalLevel === 'SALES_MANAGER_AND_FINANCE' && user?.role === 'SALES_MANAGER'
                    ? '✓ You have already submitted your decision for this quotation.'
                    : '⏳ Awaiting Sales Manager review before Finance can take action.'}
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Decision Note / Reason:
                    </label>
                    <textarea
                      rows={2}
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Enter review comments, justification, or required revision notes..."
                      className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAction('APPROVE')}
                      disabled={processing}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4" /> {processing ? 'Processing...' : 'Approve Deal'}
                    </button>

                    <button
                      onClick={() => handleAction('REQUEST_CHANGES')}
                      disabled={processing}
                      className="py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Request Changes
                    </button>

                    <button
                      onClick={() => handleAction('REJECT')}
                      disabled={processing}
                      className="py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-950/80 hover:bg-rose-900 text-rose-300 transition-all border border-rose-800/80 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 text-center text-slate-600 text-xs">Select an approval item to view details</div>
          )}
        </div>
      </div>
    </div>
  );
};
