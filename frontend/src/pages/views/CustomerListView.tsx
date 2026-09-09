import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Customer, CustomerTier } from '../../types';
import { Users, Award, TrendingUp, Sparkles, Plus, X, Building2, Package, Eye, FileText, AlertCircle } from 'lucide-react';

export const CustomerListView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tiers, setTiers] = useState<CustomerTier[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [opportunitiesData, setOpportunitiesData] = useState<any | null>(null);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [viewProductModal, setViewProductModal] = useState<any | null>(null);

  // Create Customer Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newTierId, setNewTierId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = () => {
    Promise.all([api.customers.getAll(), api.customers.getTiers()]).then(([custData, tierData]) => {
      setCustomers(custData);
      setTiers(tierData);
      if (tierData.length > 0 && !newTierId) {
        setNewTierId(tierData[0].id);
      }
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newCompany.trim()) {
      setFormError('Company Name is required.');
      return;
    }
    if (!newEmail.trim()) {
      setFormError('Email is required.');
      return;
    }

    setSubmitting(true);
    try {
      const createdCust = await api.customers.create({
        companyName: newCompany.trim(),
        contactName: newContact.trim() || undefined,
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim() || undefined,
        address: newAddress.trim() || undefined,
        tierId: newTierId || undefined,
      });

      // Reset form
      setNewCompany('');
      setNewContact('');
      setNewEmail('');
      setNewPhone('');
      setNewAddress('');
      setShowCreateModal(false);

      // Refresh list
      loadData();

      // Immediately select new customer so user can perform Create Quote
      handleSelectCustomer(createdCust);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectCustomer = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setLoadingOpps(true);
    try {
      const opps = await api.customers.getGrowthOpportunities(cust.id);
      setOpportunitiesData(opps);
    } catch (err) {
      console.error('Failed to load growth opportunities:', err);
    } finally {
      setLoadingOpps(false);
    }
  };

  const handleCreateQuoteForCustomer = (cust: Customer) => {
    window.location.hash = `create-quote?customerId=${cust.id}`;
  };

  const handleCreateQuoteForOpp = (prodId: string) => {
    if (!selectedCustomer) return;
    const targetHash = `create-quote?customerId=${selectedCustomer.id}&productId=${prodId}`;
    window.location.hash = targetHash;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-400" />
            Customer Directory & Growth Opportunities
          </h1>
          <p className="text-sm text-slate-400">View customer accounts, assigned pricing tiers, active products, and supported upsell & cross-sell opportunities.</p>
        </div>
        <button
          onClick={() => {
            setFormError('');
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Customer
        </button>
      </div>

      {/* Tiers Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <div key={t.id} className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-brand-400" /> {t.name} Tier
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">Max {t.maxDiscountPercent}% Off</span>
            </div>
            <p className="text-xs text-slate-400">{t.description || 'Standard commercial tier'}</p>
          </div>
        ))}
      </div>

      {/* Customer List */}
      <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-base font-bold text-white mb-4">Active Accounts</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">Company Name</th>
                <th className="p-3">Tier</th>
                <th className="p-3">Annual Spend</th>
                <th className="p-3">Max Tier Discount</th>
                <th className="p-3">Credit Term</th>
                <th className="p-3 text-right">Supported Products</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-all group"
                >
                  <td className="p-3 font-bold text-white group-hover:text-brand-400 transition-colors flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-400" />
                    {c.companyName}
                  </td>
                  <td className="p-3 font-semibold text-brand-400">{c.tier?.name || 'Bronze'}</td>
                  <td className="p-3 font-mono text-slate-300">₹{(c.stats?.totalValue || 0).toLocaleString()}</td>
                  <td className="p-3 font-mono text-emerald-400 font-bold">{c.tier?.maxDiscountPercent || 15}%</td>
                  <td className="p-3 text-slate-400">30 Days Net</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateQuoteForCustomer(c);
                      }}
                      className="px-3 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5 ml-auto mr-2"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Create Quote
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCustomer(c);
                      }}
                      className="px-3 py-1 rounded-lg text-[11px] font-bold bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 transition-all flex items-center gap-1.5 ml-auto"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      View Profile & Products
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Customer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-brand-400 uppercase tracking-wider mb-1">
                <Building2 className="w-4 h-4" /> New Customer Registration
              </div>
              <h2 className="text-xl font-extrabold text-white">Create New Customer</h2>
              <p className="text-xs text-slate-400 mt-1">Register a new customer account to immediately generate quotations and deals.</p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Company / Customer Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NovaTech Industries"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul@novatech.example"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Customer Tier
                  </label>
                  <select
                    value={newTierId}
                    onChange={(e) => setNewTierId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-all"
                  >
                    {tiers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Max {t.maxDiscountPercent}% Off)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Billing / Commercial Address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save & Select Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Profile & Supported Products Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-brand-400 uppercase tracking-wider mb-1">
                  <Building2 className="w-4 h-4" /> Customer Account Profile
                </div>
                <h2 className="text-xl font-extrabold text-white">{selectedCustomer.companyName}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Tier: <span className="text-brand-300 font-bold">{selectedCustomer.tier?.name || 'Bronze'}</span> • Contact: {selectedCustomer.contactName || selectedCustomer.email}
                </p>
              </div>
              <button
                onClick={() => {
                  const cust = selectedCustomer;
                  setSelectedCustomer(null);
                  handleCreateQuoteForCustomer(cust);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md transition-all flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Create Quote
              </button>
            </div>

            {/* SECTION 1: CURRENT PRODUCTS */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Package className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    Current Products
                  </h3>
                </div>
                {opportunitiesData && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    {opportunitiesData.currentProductsCount || 0} Owned / Active
                  </span>
                )}
              </div>

              {loadingOpps ? (
                <div className="py-6 text-center text-slate-500 text-xs">Loading customer's active products...</div>
              ) : opportunitiesData && opportunitiesData.currentProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {opportunitiesData.currentProducts.map((p: any) => (
                    <div key={p.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs">{p.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{p.categoryName} • {p.source}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-emerald-400 border border-emerald-900/50">
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-800">
                  No currently owned products recorded for this customer.
                </div>
              )}
            </div>

            {/* SECTION 2: SUPPORTED PRODUCTS */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    Supported Products & Growth Opportunities
                  </h3>
                </div>
                {opportunitiesData && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    {opportunitiesData.opportunitiesCount || 0} Supported
                  </span>
                )}
              </div>

              {loadingOpps ? (
                <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500"></div>
                  Evaluating customer account against active product rules...
                </div>
              ) : opportunitiesData && opportunitiesData.opportunities.length > 0 ? (
                <div className="space-y-3">
                  {opportunitiesData.opportunities.map((opp: any) => (
                    <div
                      key={opp.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-brand-500/40 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{opp.recommendedProduct.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                              opp.opportunityType === 'Upsell'
                                ? 'bg-purple-950 text-purple-300 border-purple-800'
                                : 'bg-teal-950 text-teal-300 border-teal-800'
                            }`}>
                              {opp.opportunityType}
                            </span>
                            {opp.promotionTag && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-950 text-amber-300 border border-amber-800">
                                {opp.promotionTag}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{opp.recommendedProduct.description}</p>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-sm font-bold text-white block">₹{opp.recommendedProduct.basePrice.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-500">per {opp.recommendedProduct.unit || 'unit'}</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-200">Reason: </span>
                          <span>{opp.reason}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500">Category: {opp.recommendedProduct.categoryName}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewProductModal(opp.recommendedProduct)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Product
                          </button>
                          <button
                            onClick={() => handleCreateQuoteForOpp(opp.recommendedProduct.id)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md transition-all flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Create Quote
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500 text-xs bg-slate-950/50 rounded-xl border border-slate-800">
                  No additional supported products identified for this customer.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Product Details Modal */}
      {viewProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setViewProductModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-brand-400 uppercase tracking-wider">
              <Package className="w-4 h-4" /> Product Details
            </div>

            <h3 className="text-lg font-extrabold text-white">{viewProductModal.name}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{viewProductModal.description}</p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-white">{viewProductModal.categoryName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Standard Price:</span>
                <span className="font-bold font-mono text-emerald-400">₹{viewProductModal.basePrice?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Billing Unit:</span>
                <span className="font-mono text-slate-300">{viewProductModal.unit || 'unit'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setViewProductModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const prodId = viewProductModal.id;
                  setViewProductModal(null);
                  handleCreateQuoteForOpp(prodId);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


