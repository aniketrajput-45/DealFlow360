import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Quotation } from '../types';
import { Badge } from '../components/Badge';
import { QuoteDetailsModal } from '../components/QuoteDetailsModal';
import { Kanban, ArrowRight, ShieldAlert, CheckCircle2, MessageSquare } from 'lucide-react';

export const PipelineKanbanPage: React.FC = () => {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const loadQuotes = () => {
    api.quotations.getAll().then(setQuotes);
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  const handleConvertToOrder = async (quoteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConvertingId(quoteId);
    setOrderNotice(null);
    try {
      const order = await api.orders.convert(quoteId);
      setOrderNotice(`Order ${order.orderNumber} successfully confirmed from quotation!`);
      loadQuotes();
    } catch (err: any) {
      alert(err.message || 'Failed to convert quote to order');
    } finally {
      setConvertingId(null);
    }
  };

  const stages: { id: Quotation['status']; title: string; color: string }[] = [
    { id: 'DRAFT', title: 'Drafting', color: 'border-slate-700' },
    { id: 'PENDING_APPROVAL', title: 'Pending Approval', color: 'border-amber-700' },
    { id: 'NEGOTIATION', title: 'Portal Negotiation', color: 'border-purple-700' },
    { id: 'APPROVED', title: 'Approved / Ready', color: 'border-emerald-700' },
    { id: 'ACCEPTED', title: 'Order Confirmed', color: 'border-teal-700' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Kanban className="w-6 h-6 text-brand-400" />
            Deal Pipeline & Stage Governance
          </h1>
          <p className="text-sm text-slate-400">
            Track active deals across approval, customer negotiation, and fulfillment order creation. Click any deal card to inspect terms or respond to counter-offers.
          </p>
        </div>

        <button
          onClick={loadQuotes}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
        >
          Refresh Board
        </button>
      </div>

      {orderNotice && (
        <div className="mb-6 p-4 rounded-xl bg-teal-950/80 border border-teal-800 text-teal-300 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
            {orderNotice}
          </div>
          <button onClick={() => setOrderNotice(null)} className="text-xs underline hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-6">
        {stages.map((stage) => {
          const stageQuotes = quotes.filter((q) => q.status === stage.id);
          const totalValue = stageQuotes.reduce((sum, q) => sum + q.totalAmount, 0);

          return (
            <div
              key={stage.id}
              className="bg-slate-900/70 rounded-2xl border border-slate-800 p-3.5 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="pb-3 mb-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{stage.title}</span>
                  <div className="text-[11px] font-mono text-slate-500">₹{totalValue.toLocaleString()}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-slate-400 border border-slate-700">
                  {stageQuotes.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="space-y-3 flex-1">
                {stageQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    onClick={() => setSelectedQuoteId(quote.id)}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-brand-500/60 transition-all shadow-md space-y-2.5 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-white text-xs tracking-tight group-hover:text-brand-400 transition-colors">
                          {quote.customer?.companyName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{quote.quoteNumber}</div>
                      </div>
                      <Badge status={String(quote.riskScore)} type="risk" />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-bold text-brand-400 text-sm font-mono">
                        ₹{quote.totalAmount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Rep: <strong className="text-slate-300">{quote.createdBy?.name.split(' ')[0]}</strong>
                      </span>
                    </div>

                    {/* Stage specific quick action */}
                    {quote.status === 'NEGOTIATION' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedQuoteId(quote.id);
                        }}
                        className="w-full mt-2 py-1.5 rounded-lg text-[11px] font-bold bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700 transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        <MessageSquare className="w-3 h-3 text-purple-300" />
                        Review Counter-Offer
                      </button>
                    )}

                    {quote.status === 'APPROVED' && (
                      <button
                        onClick={(e) => handleConvertToOrder(quote.id, e)}
                        disabled={convertingId === quote.id}
                        className="w-full mt-2 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        {convertingId === quote.id ? 'Creating Order...' : 'Convert to Order'}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    {quote.status === 'PENDING_APPROVAL' && (
                      <div className="text-[10px] text-amber-400 flex items-center gap-1 font-medium bg-amber-950/40 p-1.5 rounded border border-amber-900/40">
                        <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                        Requires {quote.requiredApprovalLevel.replace(/_/g, ' ')}
                      </div>
                    )}

                    {quote.status === 'ACCEPTED' && quote.order && (
                      <div className="text-[10px] text-teal-300 font-mono font-semibold bg-teal-950/40 p-1.5 rounded border border-teal-900/40 text-center">
                        Order #{quote.order.orderNumber}
                      </div>
                    )}
                  </div>
                ))}

                {stageQuotes.length === 0 && (
                  <div className="py-8 text-center text-slate-600 text-xs italic">No deals in this stage</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quote Details & Counter Offer Review Modal */}
      {selectedQuoteId && (
        <QuoteDetailsModal
          quoteId={selectedQuoteId}
          onClose={() => setSelectedQuoteId(null)}
          onQuoteUpdated={loadQuotes}
        />
      )}
    </div>
  );
};
