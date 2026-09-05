import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Customer, Product, UpsellSuggestion, RiskEvaluation } from '../types';
import { Badge } from '../components/Badge';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Info,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  discountPercent: number;
}

export const QuoteBuilderPage: React.FC<{ onQuoteCreated?: (id: string) => void }> = ({ onQuoteCreated }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [upsellSuggestions, setUpsellSuggestions] = useState<UpsellSuggestion[]>([]);
  const [evaluation, setEvaluation] = useState<RiskEvaluation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    Promise.all([api.customers.getAll(), api.products.getAll()]).then(([custs, prods]) => {
      setCustomers(custs);
      if (custs.length > 0) setSelectedCustomerId(custs[0].id);
      setProducts(prods);
    });
  }, []);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Live Risk Evaluation whenever cart or customer changes
  useEffect(() => {
    if (!selectedCustomerId || cart.length === 0) {
      setEvaluation(null);
      setUpsellSuggestions([]);
      return;
    }

    const payload = cart.map((c) => ({
      productId: c.product.id,
      quantity: c.quantity,
      discountPercent: c.discountPercent,
    }));

    api.quotations
      .evaluate(selectedCustomerId, payload)
      .then(setEvaluation)
      .catch((err) => console.error('Evaluation error:', err));

    // Fetch upsell recommendations for the first hardware product in cart
    const hardwareItem = cart.find((i) => i.product.category.name === 'Hardware');
    if (hardwareItem) {
      api.products.getUpsell(hardwareItem.product.id).then((suggestions) => {
        // Exclude items already in cart
        const cartProdIds = new Set(cart.map((c) => c.product.id));
        setUpsellSuggestions(suggestions.filter((s) => !cartProdIds.has(s.id)));
      });
    } else {
      setUpsellSuggestions([]);
    }
  }, [selectedCustomerId, cart]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product, quantity: 1, discountPercent: 0 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product.id === productId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const updateDiscount = (productId: string, discountPercent: number) => {
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, discountPercent: Math.max(0, Math.min(100, discountPercent)) } : i))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const acceptUpsell = (suggestion: UpsellSuggestion) => {
    const fullProd = products.find((p) => p.id === suggestion.id);
    if (fullProd) {
      addToCart(fullProd);
    }
  };

  const handleSubmitQuote = async () => {
    if (!selectedCustomerId || cart.length === 0) return;
    setSubmitting(true);
    setSuccessMessage(null);
    try {
      const quote = await api.quotations.create({
        customerId: selectedCustomerId,
        items: cart.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
          discountPercent: c.discountPercent,
        })),
      });

      setSuccessMessage(
        `Quotation ${quote.quoteNumber} created! Status: ${quote.status} (${
          quote.status === 'PENDING_APPROVAL' ? 'Routed for Manager Approval' : 'Auto-Approved'
        })`
      );
      setCart([]);
      if (onQuoteCreated) onQuoteCreated(quote.id);
    } catch (err: any) {
      alert(err.message || 'Failed to submit quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['ALL', ...new Set(products.map((p) => p.category.name))];
  const filteredProducts = selectedCategory === 'ALL'
    ? products
    : products.filter((p) => p.category.name === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Quotation Builder</h1>
          <p className="text-sm text-slate-400">Configure deal items, apply line discounts, and inspect live blended governance risk.</p>
        </div>

        {/* Customer Selector & Tier Badge */}
        <div className="flex items-center gap-3 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
          <label className="text-xs font-medium text-slate-400">Target Customer:</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-brand-500"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName} ({c.tier.name} Tier - {c.tier.maxDiscountPercent}% Allowance)
              </option>
            ))}
          </select>
          {selectedCustomer && (
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800/80">
              {selectedCustomer.tier.name} Tier ({selectedCustomer.tier.maxDiscountPercent}% Cap)
            </span>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            {successMessage}
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs underline hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Catalog on Left (60%), Cart & Governance on Right (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Product Catalog */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Product Catalog</h2>
            <div className="flex items-center gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredProducts.map((p) => {
              const inCart = cart.some((c) => c.product.id === p.id);
              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl bg-slate-900/90 border transition-all flex flex-col justify-between ${
                    inCart ? 'border-brand-500/80 ring-1 ring-brand-500/20 shadow-md' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-bold text-white text-sm tracking-tight">{p.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {p.category.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">{p.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-base font-extrabold text-white">₹{p.basePrice.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-400">
                        Stock: <span className="font-bold text-emerald-400">{p.totalStock} units</span>
                      </div>
                    </div>

                    <button
                      onClick={() => addToCart(p)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white transition-all flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Quotation Cart & Live Governance Engine */}
        <div className="lg:col-span-5 space-y-6">
          {/* Cart Section */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-brand-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Quotation Items ({cart.length})</h2>
              </div>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-slate-400 hover:text-rose-400">
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Your cart is empty. Click "+ Add" on any product to begin building the quotation.
              </div>
            ) : (
              <div className="space-y-3.5">
                {cart.map((item) => {
                  const evalLine = evaluation?.lines.find((l) => l.productId === item.product.id);
                  const ceiling = evalLine?.allowedDiscountLimit ?? 10;
                  const isExceeded = item.discountPercent > ceiling;

                  return (
                    <div key={item.product.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-white text-xs">{item.product.name}</div>
                          <div className="text-[11px] text-slate-400">
                            ₹{item.product.basePrice.toLocaleString()} / {item.product.unit}
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="text-slate-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="text-slate-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-slate-500 hover:text-rose-400 ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Discount Slider & Ceilings */}
                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-3 text-xs">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-slate-400">Discount:</span>
                            <span
                              className={`font-mono text-xs font-bold ${
                                isExceeded ? 'text-rose-400' : 'text-emerald-400'
                              }`}
                            >
                              {item.discountPercent}%{' '}
                              <span className="text-[10px] text-slate-500 font-normal">
                                (Cap: {ceiling}%)
                              </span>
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="30"
                            step="1"
                            value={item.discountPercent}
                            onChange={(e) => updateDiscount(item.product.id, parseInt(e.target.value, 10))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                          />
                        </div>

                        <div className="text-right">
                          <div className="font-mono font-bold text-white text-xs">
                            ₹{(evalLine?.lineTotal ?? item.quantity * item.product.basePrice).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Margin: <span className="font-bold text-teal-400">{evalLine?.marginPercent ?? 20}%</span>
                          </div>
                        </div>
                      </div>

                      {isExceeded && (
                        <div className="text-[11px] text-rose-300 font-medium bg-rose-950/50 px-2 py-1 rounded border border-rose-800/60 flex items-center gap-1.5">
                          <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                          Breaches ceiling by {Math.round((item.discountPercent - ceiling) * 10) / 10}% (Flags Approval)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Live Financial Summary */}
            {evaluation && (
              <div className="mt-5 pt-4 border-t border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-white">₹{evaluation.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Discount Given:</span>
                  <span className="font-mono font-semibold text-rose-400">-₹{evaluation.totalDiscountAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Taxes (GST 18%):</span>
                  <span className="font-mono font-semibold text-white">₹{evaluation.totalTaxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-slate-800">
                  <span>Final Total:</span>
                  <span className="font-mono text-brand-400 text-base">₹{evaluation.totalAmount.toLocaleString()}</span>
                </div>

                {/* Live Margin Bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1 font-semibold text-teal-400">
                      <TrendingUp className="w-3 h-3" /> Live Gross Margin:
                    </span>
                    <span className="font-bold text-white">₹{evaluation.totalMargin.toLocaleString()} ({evaluation.overallMarginPercent}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        evaluation.overallMarginPercent > 20 ? 'bg-teal-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, evaluation.overallMarginPercent))}%` }}
                    />
                  </div>
                </div>

                {/* Risk Governance Indicator */}
                <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-brand-400" />
                      Governance Risk Score:
                    </span>
                    <Badge status={String(evaluation.riskScore)} type="risk" />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Required Approval:</span>
                    <Badge status={evaluation.requiredApprovalLevel} type="approval" />
                  </div>
                  <p className="text-[11px] text-slate-400 italic leading-snug">{evaluation.riskExplanation}</p>
                </div>

                <button
                  onClick={handleSubmitQuote}
                  disabled={submitting}
                  className="w-full py-3 rounded-xl text-xs font-bold tracking-wide uppercase bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 mt-4"
                >
                  {submitting ? 'Evaluating & Submitting...' : 'Submit Quotation for Routing'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Upsell / Cross-Sell Panel (PDF Step 4 Requirement) */}
          {upsellSuggestions.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 rounded-2xl border border-indigo-800/40 p-5 shadow-xl">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Live Upsell Recommendations (Margin Delta)
              </div>

              <div className="space-y-3">
                {upsellSuggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className="p-3 rounded-xl bg-slate-950/90 border border-indigo-900/40 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{sug.name}</span>
                        {sug.promotionTag && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-800">
                            {sug.promotionTag}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-medium">
                        +₹{sug.marginDelta.toLocaleString()} Margin Delta ({sug.marginPercent}%)
                      </div>
                    </div>

                    <button
                      onClick={() => acceptUpsell(sug)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm shrink-0"
                    >
                      Add to Quote
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
