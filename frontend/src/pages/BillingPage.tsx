import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Invoice, Subscription } from '../types';
import { Badge } from '../components/Badge';
import {
  CreditCard,
  Receipt,
  Repeat,
  PlusCircle,
  CheckCircle2,
  Calendar,
  X,
} from 'lucide-react';

export const BillingPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeTab, setActiveTab] = useState<'invoices' | 'subscriptions'>('invoices');
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadBillingData = () => {
    Promise.all([api.billing.getInvoices(), api.billing.getSubscriptions()]).then(([invs, subs]) => {
      setInvoices(invs);
      setSubscriptions(subs);
    });
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  const openPaymentModal = (invoice: Invoice) => {
    setPayingInvoice(invoice);
    setPaymentAmount(invoice.outstandingAmount);
    setPaymentReference(`REF-${Date.now().toString().slice(-6)}`);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;

    setSubmittingPayment(true);
    setFeedback(null);
    try {
      const res = await api.billing.recordPayment({
        invoiceId: payingInvoice.id,
        amount: paymentAmount,
        paymentMethod,
        reference: paymentReference,
      });

      setFeedback(`Payment of ₹${paymentAmount.toLocaleString()} recorded! Invoice status updated to ${res.updatedInvoice.status}.`);
      setPayingInvoice(null);
      loadBillingData();
    } catch (err: any) {
      alert(err.message || 'Payment recording failed');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleCancelSub = async (subId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription? Mid-cycle proration will be applied.')) return;
    try {
      const res = await api.billing.cancelSubscription(subId, 'Customer cancellation request');
      alert(`Subscription cancelled! Calculated Prorated Refund/Credit: ₹${res.calculatedProratedRefund.toLocaleString()} (${res.daysRemainingInCycle} days remaining)`);
      loadBillingData();
    } catch (err: any) {
      alert(err.message || 'Cancellation failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-400" />
            Hybrid Billing & Payment Reconciliation
          </h1>
          <p className="text-sm text-slate-400">
            Real-time reconciliation of one-time hardware invoices alongside recurring subscription schedules.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'invoices' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" /> Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'subscriptions' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Repeat className="w-4 h-4" /> Subscriptions ({subscriptions.length})
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            {feedback}
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs underline hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Invoices View */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {invoices.map((inv) => (
              <div key={inv.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-base tracking-tight">{inv.customer?.companyName}</span>
                      <Badge status={inv.status} type="invoice" />
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Invoice #{inv.invoiceNumber} {inv.order && `• Order #${inv.order.orderNumber}`}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Total Due</span>
                    <span className="text-lg font-extrabold text-white font-mono">₹{inv.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Balance Breakdown */}
                <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Total Amount</span>
                    <span className="font-bold text-white font-mono">₹{inv.totalAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Amount Paid</span>
                    <span className="font-bold text-emerald-400 font-mono">₹{inv.totalPaid.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Outstanding</span>
                    <span className="font-bold text-rose-400 font-mono">₹{inv.outstandingAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Line Items Snapshot */}
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Billed Items</span>
                  <div className="space-y-1.5">
                    {inv.items.map((item) => (
                      <div key={item.id} className="text-xs flex items-center justify-between text-slate-300">
                        <span>{item.description}</span>
                        <span className="font-mono text-white font-semibold">₹{item.lineTotal.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Due Date: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Net 30'}
                  </span>

                  {inv.status !== 'PAID' ? (
                    <button
                      onClick={() => openPaymentModal(inv)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white transition-all flex items-center gap-1.5 shadow-md shadow-brand-500/20"
                    >
                      <PlusCircle className="w-4 h-4" /> Record Payment
                    </button>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Fully Settled
                    </span>
                  )}
                </div>
              </div>
            ))}

            {invoices.length === 0 && (
              <div className="py-16 text-center text-slate-500 text-xs italic">
                No invoices issued yet. Convert an approved quotation to an order to automatically generate invoices.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subscriptions View */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="font-bold text-white text-base">{sub.product.name}</h3>
                    <div className="text-xs text-slate-400">Client: {sub.customer.companyName}</div>
                  </div>
                  <Badge status={sub.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Recurring Rate</span>
                    <span className="font-bold text-brand-400 font-mono text-sm">
                      ₹{sub.unitPrice.toLocaleString()} / {sub.billingInterval}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Next Cycle Date</span>
                    <span className="font-bold text-white flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-brand-400" />
                      {new Date(sub.nextBillingDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {sub.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleCancelSub(sub.id)}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 transition-all"
                  >
                    Cancel Subscription with Prorated Refund
                  </button>
                )}
              </div>
            ))}

            {subscriptions.length === 0 && (
              <div className="py-16 text-center text-slate-500 text-xs italic col-span-2">
                No active subscriptions found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Record Payment</h3>
                <p className="text-xs text-slate-400">Invoice #{payingInvoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setPayingInvoice(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Outstanding Balance:</span>
                <span className="text-base font-extrabold text-rose-400 font-mono">
                  ₹{payingInvoice.outstandingAmount.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Payment Amount (₹):</label>
                <input
                  type="number"
                  step="0.01"
                  max={payingInvoice.outstandingAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 text-white font-mono font-bold text-sm p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-500"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS)</option>
                  <option value="UPI">UPI Instant Transfer</option>
                  <option value="CARD">Corporate Credit Card</option>
                  <option value="CASH">Cash Deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Transaction Reference Number:</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. UTR-992019482 or Cheque No."
                  className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-brand-500 font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment || paymentAmount <= 0}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20"
                >
                  {submittingPayment ? 'Reconciling...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
