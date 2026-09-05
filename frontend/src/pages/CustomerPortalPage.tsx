import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Quotation } from '../types';
import { Badge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  CheckCircle2,
  MessageSquare,
  Send,
  Lock,
  DollarSign,
} from 'lucide-react';

export const CustomerPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [commentText, setCommentText] = useState('');
  const [counterDiscount, setCounterDiscount] = useState<number>(18);
  const [counterNote, setCounterNote] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);
  const [acceptingQuote, setAcceptingQuote] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadCustomerQuotes = () => {
    api.quotations.getAll().then((data) => {
      setQuotes(data);
      if (data.length > 0 && !selectedQuote) {
        setSelectedQuote(data[0]);
      } else if (selectedQuote) {
        const refreshed = data.find((q) => q.id === selectedQuote.id);
        setSelectedQuote(refreshed || data[0] || null);
      }
    });
  };

  useEffect(() => {
    loadCustomerQuotes();
  }, [user]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote || !commentText.trim()) return;

    try {
      await api.quotations.addComment(selectedQuote.id, commentText);
      setCommentText('');
      // Reload full quote
      const updated = await api.quotations.getById(selectedQuote.id);
      setSelectedQuote(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    }
  };

  const handleSubmitCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote) return;

    setSubmittingCounter(true);
    setFeedback(null);
    try {
      await api.negotiations.counter(selectedQuote.id, counterDiscount, counterNote);
      setFeedback(`Counter-offer of ${counterDiscount}% discount submitted! Quote is now under review by the seller.`);
      setCounterNote('');
      loadCustomerQuotes();
      const updated = await api.quotations.getById(selectedQuote.id);
      setSelectedQuote(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to submit counter offer');
    } finally {
      setSubmittingCounter(false);
    }
  };

  const handleAcceptQuote = async () => {
    if (!selectedQuote) return;
    setAcceptingQuote(true);
    setFeedback(null);
    try {
      const order = await api.orders.convert(selectedQuote.id);
      setFeedback(`Terms accepted! Confirmed Order #${order.orderNumber} created.`);
      loadCustomerQuotes();
      const updated = await api.quotations.getById(selectedQuote.id);
      setSelectedQuote(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to accept quote');
    } finally {
      setAcceptingQuote(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Customer Header */}
      <div className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-900/40 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-900/60 border border-purple-700 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white">{user?.customerName || 'Customer Portal'}</h1>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Secure Restricted View
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Review received commercial proposals, ask questions, propose counter-discounts, and confirm final terms.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 block">Logged in as Contact:</span>
          <span className="font-bold text-white text-sm">{user?.name}</span>
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

      {/* Grid: Quotes List on Left, Active Negotiation on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Quotes List */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block pb-2 border-b border-slate-800">
            Available Proposals ({quotes.length})
          </span>

          <div className="space-y-3">
            {quotes.map((q) => {
              const isSelected = selectedQuote?.id === q.id;
              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuote(q)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-purple-500 shadow-md ring-1 ring-purple-500/20'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-bold text-white text-xs font-mono">{q.quoteNumber}</span>
                    <Badge status={q.status} type="quote" />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                    <span className="font-mono text-brand-400 font-extrabold text-sm">
                      ₹{q.totalAmount.toLocaleString()}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}

            {quotes.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs italic">
                No active quotations found for your account.
              </div>
            )}
          </div>
        </div>

        {/* Right: Negotiation & Terms Review */}
        <div className="lg:col-span-8">
          {selectedQuote ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
              {/* Proposal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white">Quotation #{selectedQuote.quoteNumber}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Offered by {selectedQuote.createdBy?.name} • Valid until Net 30
                  </p>
                </div>
                <Badge status={selectedQuote.status} type="quote" />
              </div>

              {/* Items List */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Quotation Lines</h3>
                <div className="space-y-2">
                  {selectedQuote.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{item.product?.name || 'Product'}</div>
                        <div className="text-[11px] text-slate-400">
                          Qty: {item.quantity} • Offered Discount: {item.discountPercent}%
                        </div>
                      </div>
                      <div className="font-mono font-bold text-white text-sm">
                        ₹{item.lineTotal.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[11px] text-slate-400 block">Subtotal</span>
                  <span className="font-bold text-white font-mono text-sm">₹{selectedQuote.subtotal.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Total Discount</span>
                  <span className="font-bold text-rose-400 font-mono text-sm">-₹{selectedQuote.discountAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Total Payable</span>
                  <span className="font-extrabold text-brand-400 font-mono text-base">₹{selectedQuote.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Counter-Offer Negotiation Form */}
              {['APPROVED', 'DRAFT', 'NEGOTIATION'].includes(selectedQuote.status) && (
                <div className="p-5 rounded-xl bg-purple-950/20 border border-purple-900/40 space-y-4">
                  <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
                    <DollarSign className="w-4 h-4" /> Propose Counter-Discount Terms
                  </div>

                  <form onSubmit={handleSubmitCounter} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Requested Counter Discount (%):
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={counterDiscount}
                          onChange={(e) => setCounterDiscount(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 text-white font-mono font-bold text-xs p-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-purple-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Reason or Commercial Context:
                        </label>
                        <input
                          type="text"
                          value={counterNote}
                          onChange={(e) => setCounterNote(e.target.value)}
                          placeholder="e.g. Budget ceiling, annual commitment"
                          className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingCounter}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/20"
                    >
                      {submittingCounter ? 'Submitting Counter...' : 'Submit Counter-Offer for Seller Review'}
                    </button>
                  </form>
                </div>
              )}

              {/* Accept Terms Button (One-Click) */}
              {['APPROVED'].includes(selectedQuote.status) && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-300">Terms are fully approved by seller!</div>
                    <div className="text-[11px] text-slate-400">Click below to accept and generate your confirmed order.</div>
                  </div>

                  <button
                    onClick={handleAcceptQuote}
                    disabled={acceptingQuote}
                    className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/25 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirm Terms with One Click
                  </button>
                </div>
              )}

              {/* Discussion & Line Comments */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Deal Discussion & Comments
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {selectedQuote.comments && selectedQuote.comments.length > 0 ? (
                    selectedQuote.comments.map((com) => (
                      <div key={com.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span className="font-bold text-slate-300">
                            {com.user.name} ({com.user.role.name})
                          </span>
                          <span>{new Date(com.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-200">{com.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic py-2">No comments posted yet.</div>
                  )}
                </div>

                <form onSubmit={handleSendComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Ask a question or request a line-item adjustment..."
                    className="flex-1 bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-slate-800 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> Send
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-slate-600 text-xs">Select a quotation to view commercial terms</div>
          )}
        </div>
      </div>
    </div>
  );
};
