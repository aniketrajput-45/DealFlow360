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
  },

  // Quotations & Risk Engine
  quotations: {
    evaluate: (customerId: string, items: { productId: string; quantity: number; discountPercent: number; unitPrice?: number }[]) =>
      fetch(`${API_BASE}/quotes/evaluate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ customerId, items }),
      }).then((r) => handleResponse<RiskEvaluation>(r)),

    create: (data: { customerId: string; items: { productId: string; quantity: number; discountPercent: number; unitPrice?: number }[]; validDays?: number }) =>
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
    getAll: (status = 'PENDING') =>
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
};
