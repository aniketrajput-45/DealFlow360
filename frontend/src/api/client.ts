import {
  User,
  Customer,
  CustomerTier,
  Product,
  ProductCategory,
  UpsellSuggestion,
  RiskEvaluation,
  Quotation,
  Approval,
  Order,
  Invoice,
  Subscription,
  DealHealthAlerts,
  Warehouse,
} from '../types';

const API_BASE = '/api';

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('df360_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'API Request failed');
  }
  return data as T;
}

export const api = {
  // Auth
  auth: {
    login: (email: string, password = 'password123') =>
      fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then((r) => handleResponse<{ token: string; user: User }>(r)),

    getMe: () =>
      fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders(),
      }).then((r) => handleResponse<{ user: User }>(r)),

    getDemoAccounts: () =>
      fetch(`${API_BASE}/auth/demo-accounts`).then((r) =>
        handleResponse<{ id: string; name: string; email: string; role: string; companyName: string | null }[]>(r)
      ),
  },

  // Products & Upsell
  products: {
    getAll: () =>
      fetch(`${API_BASE}/products`, { headers: getAuthHeaders() }).then((r) => handleResponse<Product[]>(r)),

    getCategories: () =>
      fetch(`${API_BASE}/products/categories`, { headers: getAuthHeaders() }).then((r) =>
        handleResponse<ProductCategory[]>(r)
      ),

    getUpsell: (productId: string) =>
      fetch(`${API_BASE}/products/upsell/${productId}`, { headers: getAuthHeaders() }).then((r) =>
        handleResponse<UpsellSuggestion[]>(r)
      ),

    create: (data: any) =>
      fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }).then((r) => handleResponse<Product>(r)),

    update: (id: string, data: any) =>
      fetch(`${API_BASE}/products/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }).then((r) => handleResponse<Product>(r)),
  },

  // Customers
  customers: {
    getAll: () =>
      fetch(`${API_BASE}/customers`, { headers: getAuthHeaders() }).then((r) => handleResponse<Customer[]>(r)),

    getTiers: () =>
      fetch(`${API_BASE}/customers/tiers`, { headers: getAuthHeaders() }).then((r) =>
        handleResponse<CustomerTier[]>(r)
      ),

    getById: (id: string) =>
      fetch(`${API_BASE}/customers/${id}`, { headers: getAuthHeaders() }).then((r) => handleResponse<Customer>(r)),

    getGrowthOpportunities: (id: string) =>
      fetch(`${API_BASE}/customers/${id}/growth-opportunities`, { headers: getAuthHeaders() }).then((r) =>
        handleResponse<any>(r)
      ),

    getMyRecommendations: () =>
      fetch(`${API_BASE}/customers/my-recommendations`, { headers: getAuthHeaders() }).then((r) =>
        handleResponse<any>(r)
      ),
  },

  // Quotations & Risk Engine
  quotations: {
    evaluate: (customerId: string, items: { productId: string; quantity: number; discountPercent: number; unitPrice?: number }[]) =>
      fetch(`${API_BASE}/quotes/evaluate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ customerId, items }),
      }).then((r) => handleResponse<RiskEvaluation>(r)),

    create: (data: { id?: string; customerId: string; items: { productId: string; quantity: number; discountPercent: number; unitPrice?: number }[]; validDays?: number; saveDraft?: boolean }) =>
      fetch(`${API_BASE}/quotes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }).then((r) => handleResponse<Quotation>(r)),

    getAll: (status?: string, customerId?: string) => {
      const query = new URLSearchParams();
      if (status) query.append('status', status);
      if (customerId) query.append('customerId', customerId);
      return fetch(`${API_BASE}/quotes?${query.toString()}`, { headers: getAuthHeaders() }).then((r) =>
        handleResponse<Quotation[]>(r)
      );
    },

    getById: (id: string) =>
      fetch(`${API_BASE}/quotes/${id}`, { headers: getAuthHeaders() }).then((r) => handleResponse<Quotation>(r)),

    addComment: (id: string, message: string, quotationItemId?: string) =>
      fetch(`${API_BASE}/quotes/${id}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, quotationItemId }),
      }).then((r) => handleResponse<any>(r)),
  },

  // Approvals
  approvals: {
    getAll: (status = 'ALL') =>
      fetch(`${API_BASE}/approvals?status=${status}`, { headers: getAuthHeaders() }).then((r) =>
        handleResponse<Approval[]>(r)
      ),

    takeAction: (id: string, action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES', reason?: string) =>
      fetch(`${API_BASE}/approvals/${id}/action`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, reason }),
      }).then((r) => handleResponse<{ message: string; approvalStatus: string; quotationStatus: string }>(r)),
  },

  // Orders & Fulfillment
  orders: {
    convert: (quotationId: string) =>
      fetch(`${API_BASE}/orders/convert`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quotationId }),
      }).then((r) => handleResponse<Order>(r)),

    getAll: () =>
      fetch(`${API_BASE}/orders`, { headers: getAuthHeaders() }).then((r) => handleResponse<Order[]>(r)),

    getById: (id: string) =>
      fetch(`${API_BASE}/orders/${id}`, { headers: getAuthHeaders() }).then((r) => handleResponse<Order>(r)),
  },

  fulfillment: {
    preview: (productId: string, quantity: number) =>
      fetch(`${API_BASE}/fulfillment/preview`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ productId, quantity }),
      }).then((r) => handleResponse<any>(r)),

    getWarehouses: () =>
      fetch(`${API_BASE}/fulfillment/warehouses`, { headers: getAuthHeaders() }).then((r) =>
        handleResponse<Warehouse[]>(r)
      ),
  },

  // Billing & Payments
  billing: {
    getInvoices: () =>
      fetch(`${API_BASE}/billing/invoices`, { headers: getAuthHeaders() }).then((r) => handleResponse<Invoice[]>(r)),

    getInvoiceById: (id: string) =>
      fetch(`${API_BASE}/billing/invoices/${id}`, { headers: getAuthHeaders() }).then((r) =>
        handleResponse<Invoice>(r)
      ),

    recordPayment: (data: { invoiceId: string; amount: number; paymentMethod: string; reference?: string }) =>
      fetch(`${API_BASE}/billing/payments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }).then((r) => handleResponse<any>(r)),

    getSubscriptions: () =>
      fetch(`${API_BASE}/billing/subscriptions`, { headers: getAuthHeaders() }).then((r) =>
        handleResponse<Subscription[]>(r)
      ),

    cancelSubscription: (id: string, reason?: string) =>
      fetch(`${API_BASE}/billing/subscriptions/${id}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      }).then((r) => handleResponse<any>(r)),
  },

  // Negotiations (Customer Portal)
  negotiations: {
    counter: (quotationId: string, proposedDiscountPercent: number, message?: string) =>
      fetch(`${API_BASE}/negotiations/counter`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quotationId, proposedDiscountPercent, message }),
      }).then((r) => handleResponse<any>(r)),

    respond: (negotiationId: string, action: 'APPROVE' | 'REJECT', responseMessage?: string) =>
      fetch(`${API_BASE}/negotiations/${negotiationId}/respond`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, responseMessage }),
      }).then((r) => handleResponse<any>(r)),
  },

  // Reporting & Alerts
  reporting: {
    getHealth: () =>
      fetch(`${API_BASE}/reporting/health`, { headers: getAuthHeaders() }).then((r) =>
        handleResponse<DealHealthAlerts>(r)
      ),

    getOverview: () =>
      fetch(`${API_BASE}/reporting/overview`, { headers: getAuthHeaders() }).then((r) => handleResponse<any>(r)),

    nudge: (quoteId: string, actionType = 'NUDGE_REP', notes?: string) =>
      fetch(`${API_BASE}/reporting/nudge`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quoteId, actionType, notes }),
      }).then((r) => handleResponse<any>(r)),
  },

  // Warehouses & Stock
  warehouses: {
    list: () =>
      fetch(`${API_BASE}/fulfillment/warehouses`, { headers: getAuthHeaders() }).then((r) =>
        handleResponse<Warehouse[]>(r)
      ),
  },

  // Subscriptions
  subscriptions: {
    listPlans: () =>
      fetch(`${API_BASE}/subscriptions/plans`, { headers: getAuthHeaders() }).then((r) =>
        handleResponse<any[]>(r)
      ).catch(() => fetch(`${API_BASE}/billing/subscriptions`, { headers: getAuthHeaders() }).then((r) => handleResponse<any[]>(r))),
  },

  // Audit Logs
  audit: {
    getLogs: (params?: { entityType?: string; entityId?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.entityType) q.append('entityType', params.entityType);
      if (params?.entityId) q.append('entityId', params.entityId);
      if (params?.limit) q.append('limit', String(params.limit));
      return fetch(`${API_BASE}/audit?${q.toString()}`, { headers: getAuthHeaders() }).then((r) =>
        handleResponse<any[]>(r)
      );
    },
  },

  // Admin Workspace
  admin: {
    getStats: () =>
      fetch(`${API_BASE}/admin/stats`, { headers: getAuthHeaders() }).then((r) => handleResponse<any>(r)),

    getUsers: () =>
      fetch(`${API_BASE}/admin/users`, { headers: getAuthHeaders() }).then((r) => handleResponse<any[]>(r)),

    createUser: (data: { name: string; email: string; roleName: string; password?: string; customerId?: string }) =>
      fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }).then((r) => handleResponse<any>(r)),

    updateUserRole: (id: string, roleName: string) =>
      fetch(`${API_BASE}/admin/users/${id}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ roleName }),
      }).then((r) => handleResponse<any>(r)),

    getPricingRules: () =>
      fetch(`${API_BASE}/admin/pricing-rules`, { headers: getAuthHeaders() }).then((r) => handleResponse<any[]>(r)),

    createPricingRule: (data: { productId: string; customerTierId?: string; price: number; currency?: string }) =>
      fetch(`${API_BASE}/admin/pricing-rules`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }).then((r) => handleResponse<any>(r)),

    updatePricingRule: (id: string, data: { price?: number; isActive?: boolean }) =>
      fetch(`${API_BASE}/admin/pricing-rules/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }).then((r) => handleResponse<any>(r)),

    deletePricingRule: (id: string) =>
      fetch(`${API_BASE}/admin/pricing-rules/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }).then((r) => handleResponse<any>(r)),

    getDiscountGovernance: () =>
      fetch(`${API_BASE}/admin/discount-governance`, { headers: getAuthHeaders() }).then((r) => handleResponse<any>(r)),

    updateCustomerTierCeiling: (tierId: string, maxDiscountPercent: number) =>
      fetch(`${API_BASE}/admin/discount-governance/tier/${tierId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ maxDiscountPercent }),
      }).then((r) => handleResponse<any>(r)),

    updateCategoryDiscountRule: (categoryId: string, maxDiscountPercent: number, approvalLevel?: string) =>
      fetch(`${API_BASE}/admin/discount-governance/category/${categoryId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ maxDiscountPercent, approvalLevel }),
      }).then((r) => handleResponse<any>(r)),

    getUpsellRules: () =>
      fetch(`${API_BASE}/admin/upsell-rules`, { headers: getAuthHeaders() }).then((r) => handleResponse<any[]>(r)),

    createUpsellRule: (data: { sourceProductId: string; suggestedProductId: string; promotionTag?: string; priority?: number }) =>
      fetch(`${API_BASE}/admin/upsell-rules`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }).then((r) => handleResponse<any>(r)),

    updateUpsellRule: (id: string, data: { promotionTag?: string; priority?: number; isActive?: boolean }) =>
      fetch(`${API_BASE}/admin/upsell-rules/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }).then((r) => handleResponse<any>(r)),

    deleteUpsellRule: (id: string) =>
      fetch(`${API_BASE}/admin/upsell-rules/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }).then((r) => handleResponse<any>(r)),

    getLogs: () =>
      fetch(`${API_BASE}/audit`, { headers: getAuthHeaders() }).then((r) => handleResponse<any[]>(r)),
  },
};
