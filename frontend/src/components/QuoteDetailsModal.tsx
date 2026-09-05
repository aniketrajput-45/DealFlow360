import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Quotation } from '../types';
import { Badge } from './Badge';
import {
  X,
  FileText,
  DollarSign,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  ArrowRight,
} from 'lucide-react';

interface Props {
  quoteId: string | null;
  onClose: () => void;
  onQuoteUpdated?: () => void;
}

export const QuoteDetailsModal: React.FC<Props> = ({ quoteId, onClose, onQuoteUpdated }) => {
  const [quote, setQuote] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [responseNote, setResponseNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadQuote = () => {
    if (!quoteId) return;
    setLoading(true);
    api.quotations
      .getById(quoteId)
      .then(setQuote)
      .catch((err) => console.error('Failed to load quote details:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQuote();
  }, [quoteId]);

  if (!quoteId) return null;

  const handleRespondCounter = async (action: 'APPROVE' | 'REJECT') => {
    const pendingNeg = quote?.negotiations?.find((n) => n.status === 'PENDING');
    if (!pendingNeg) return;

    setSubmittingAction(true);
    setFeedback(null);

    try {
      await api.negotiations.respond(pendingNeg.id, action, responseNote);
      setFeedback({
        type: 'success',
        text: `Counter-offer successfully ${action === 'APPROVE' ? 'accepted' : 'rejected'}.`,
      });
      setResponseNote('');
      loadQuote();
      if (onQuoteUpdated) onQuoteUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSubmitDraft = async () => {
    if (!quote) return;
    setSubmittingAction(true);
    setFeedback(null);
    try {
      const updated = await api.quotations.create({
        id: quote.id,
        customerId: quote.customerId,
        saveDraft: false,
        items: quote.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          discountPercent: i.discountPercent,
        })),
      });
      setFeedback({
        type: 'success',
        text: `Quotation ${updated.quoteNumber} submitted for routing! Status: ${updated.status}`,
      });
      loadQuote();
      if (onQuoteUpdated) onQuoteUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to submit draft' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteId || !commentText.trim()) return;

    try {
      await api.quotations.addComment(quoteId, commentText);
      setCommentText('');
      loadQuote();
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    }
  };

  const pendingNeg = quote?.negotiations?.find((n) => n.status === 'PENDING');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-950 text-brand-400 border border-brand-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Quotation #{quote?.quoteNumber || '...'}</h2>
                {quote && <Badge status={quote.status} />}
              </div>
              <p className="text-xs text-slate-400">
                Customer: <strong className="text-slate-200">{quote?.customer?.companyName}</strong> ({quote?.customer?.tier?.name} Tier)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-800 text-rose-300'
              }`}
            >
              <span>{feedback.text}</span>
              <button onClick={() => setFeedback(null)} className="underline hover:text-white text-[11px]">
                Dismiss
              </button>
            </div>
          )}

          {loading || !quote ? (
            <div className="py-12 text-center text-slate-500 italic">Loading quotation details...</div>
          ) : (
            <>
              {/* Draft Submission Banner */}
              {quote.status === 'DRAFT' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-slate-200 text-xs">This quotation is currently saved as a DRAFT.</div>
                    <div className="text-[11px] text-slate-400">Ready to route for managerial approval or auto-approval?</div>
                  </div>
                  <button
                    onClick={handleSubmitDraft}
                    disabled={submittingAction}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-md flex items-center gap-1.5 shrink-0"
                  >
                    {submittingAction ? 'Submitting...' : 'Submit Draft for Routing'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Customer Counter-Offer Review Banner */}
              {pendingNeg && (
                <div className="p-5 rounded-xl bg-purple-950/40 border border-purple-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-purple-300 text-sm">
                      <DollarSign className="w-4 h-4 text-purple-400" />
                      Active Customer Counter-Offer Pending Review
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-900 text-purple-200 uppercase">
                      Action Required
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-lg border border-purple-900/40 font-mono text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Previous Disc.</span>
                      <span className="font-bold text-slate-300">{pendingNeg.previousDiscountPercent}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Proposed Disc.</span>
                      <span className="font-extrabold text-purple-400 text-sm">{pendingNeg.proposedDiscountPercent}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Previous Total</span>
                      <span className="font-bold text-slate-300">₹{pendingNeg.previousTotalAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Proposed Total</span>
                      <span className="font-bold text-purple-300">₹{pendingNeg.proposedTotalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {pendingNeg.message && (
                    <div className="text-slate-300 text-xs italic bg-slate-950/60 p-2.5 rounded border border-slate-800">
                      &quot;{pendingNeg.message}&quot; — <strong className="text-purple-300 font-normal">{pendingNeg.initiatedBy?.name}</strong>
                    </div>
                  )}

                  {/* Counter Offer Response Form */}
                  <div className="pt-2 space-y-2">
                    <input
                      type="text"
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      placeholder="Optional response note to customer (e.g. Terms agreed for volume commitment)..."
                      className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-slate-800 focus:outline-none focus:border-purple-500"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespondCounter('APPROVE')}
                        disabled={submittingAction}
                        className="flex-1 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Accept Counter-Offer ({pendingNeg.proposedDiscountPercent}%)
                      </button>
                      <button
                        onClick={() => handleRespondCounter('REJECT')}
                        disabled={submittingAction}
                        className="flex-1 py-2 rounded-lg text-xs font-bold bg-rose-900/80 hover:bg-rose-800 text-rose-200 transition-all border border-rose-800 flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" /> Reject Counter-Offer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quotation Line Items Table */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-300 text-xs uppercase tracking-wider">Quotation Items</h3>
                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-mono border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5">Qty</th>
                        <th className="p-2.5">Unit Price</th>
                        <th className="p-2.5">Discount</th>
                        <th className="p-2.5">Line Total</th>
                        <th className="p-2.5">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {quote.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/40">
                          <td className="p-2.5 font-semibold text-white">{item.product?.name || 'Product'}</td>
                          <td className="p-2.5 font-mono">{item.quantity}</td>
                          <td className="p-2.5 font-mono">₹{item.unitPrice.toLocaleString()}</td>
                          <td className="p-2.5 font-mono text-rose-400 font-bold">{item.discountPercent}%</td>
                          <td className="p-2.5 font-mono font-bold text-white">₹{item.lineTotal.toLocaleString()}</td>
                          <td className="p-2.5 font-mono text-emerald-400">{item.marginPercent?.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals & Risk Evaluation Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Commercial Summary */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="text-white">₹{quote.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>Total Discount:</span>
                    <span>-₹{quote.discountAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Taxes (GST):</span>
                    <span className="text-white">₹{quote.taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-slate-800 pt-2">
                    <span className="text-white">Total Amount:</span>
                    <span className="text-brand-400">₹{quote.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Risk & Governance Summary */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Risk Score:</span>
                    <Badge status={String(quote.riskScore)} type="risk" />
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Required Approval Level: <strong className="text-amber-400 font-mono">{quote.requiredApprovalLevel}</strong>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono">
                    Gross Margin: ₹{quote.totalMargin.toLocaleString()} (
                    {quote.totalAmount > 0 ? ((quote.totalMargin / quote.totalAmount) * 100).toFixed(1) : 0}%)
                  </div>
                </div>
              </div>

              {/* Comments & Conversation Thread */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-brand-400" /> Quotation Comments & Activity
                </h3>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {quote.comments && quote.comments.length > 0 ? (
                    quote.comments.map((com) => (
                      <div key={com.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span className="font-bold text-slate-300">
                            {com.user.name} ({com.user.role.name})
                          </span>
                          <span>{new Date(com.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-200 text-xs">{com.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic py-2">No discussion comments recorded yet.</div>
                  )}
                </div>

                <form onSubmit={handleSendComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Type an internal note or customer comment..."
                    className="flex-1 bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-slate-800 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> Post
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
