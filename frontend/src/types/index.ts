export type UserRole = 'ADMIN' | 'SALES_REP' | 'SALES_MANAGER' | 'FINANCE' | 'WAREHOUSE' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  customerId?: string | null;
  customerName?: string | null;
}

export interface CustomerTier {
  id: string;
  name: 'Bronze' | 'Silver' | 'Gold';
  maxDiscountPercent: number;
  description?: string;
}

export interface Customer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  address?: string;
  tier: CustomerTier;
  stats?: {
    totalQuotes: number;
    activeQuotes: number;
    totalValue: number;
  };
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  maxDiscountPercent: number;
  approvalLevel: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  unit: string;
  basePrice: number;
  costPrice: number;
  taxPercent: number;
  productType: 'ONE_TIME' | 'RECURRING';
  billingInterval?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | null;
  category: {
    id: string;
    name: string;
    maxDiscountPercent: number;
  };
  totalStock: number;
  inventory?: {
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    quantityAvailable: number;
  }[];
}

export interface UpsellSuggestion {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  costPrice: number;
  taxPercent: number;
  unit: string;
  productType: string;
  billingInterval?: string | null;
  category: string;
  promotionTag?: string;
  marginDelta: number;
  marginPercent: number;
}

export interface EvaluatedLine {
  productId: string;
  productName: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  lineSubtotal: number;
  taxableAmount: number;
  lineTotal: number;
  marginAmount: number;
  marginPercent: number;
  allowedDiscountLimit: number;
  customerTierLimit: number;
  categoryLimit: number;
  riskPoints: number;
}

export interface RiskEvaluation {
  lines: EvaluatedLine[];
  subtotal: number;
  totalDiscountAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
  totalCost: number;
  totalMargin: number;
  overallMarginPercent: number;
  averageDiscountPercent: number;
  riskScore: number;
  requiredApprovalLevel: 'NONE' | 'SALES_MANAGER' | 'SALES_MANAGER_AND_FINANCE';
  riskExplanation: string;
  requiresApproval: boolean;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  customerId: string;
  customer: Customer;
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'NEGOTIATION' | 'ACCEPTED' | 'CANCELLED';
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  totalMargin: number;
  riskScore: number;
  requiredApprovalLevel: string;
  validUntil?: string;
  items: (EvaluatedLine & { id: string; product: Product })[];
  approvals?: Approval[];
  negotiations?: Negotiation[];
  comments?: QuoteComment[];
  order?: { id: string; orderNumber: string; status: string };
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalAction {
  id: string;
  userId: string;
  user: { id: string; name: string; role: { name: string } };
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  reason?: string;
  createdAt: string;
}

export interface Approval {
  id: string;
  quotationId: string;
  quotation: Quotation;
  approvalLevel: 'SALES_MANAGER' | 'FINANCE' | 'SALES_MANAGER_AND_FINANCE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  riskScore: number;
  reason: string;
  actions: ApprovalAction[];
  canAct?: boolean;
  createdAt: string;
}

export interface Negotiation {
  id: string;
  quotationId: string;
  initiatedById: string;
  initiatedBy: { id: string; name: string };
  previousDiscountPercent: number;
  proposedDiscountPercent: number;
  previousTotalAmount: number;
  proposedTotalAmount: number;
  riskScore: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACCEPTED';
  message?: string;
  createdAt: string;
}

export interface QuoteComment {
  id: string;
  quotationId: string;
  quotationItemId?: string | null;
  userId: string;
  user: { id: string; name: string; role: { name: string } };
  message: string;
  isCustomerVisible: boolean;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  shippingCostWeight: number;
  inventory?: {
    productId: string;
    product: Product;
    quantityAvailable: number;
  }[];
}

export interface Order {
  id: string;
  orderNumber: string;
  quotationId: string;
  quotation: { id: string; quoteNumber: string };
  customerId: string;
  customer: Customer;
  status: 'CONFIRMED' | 'PROCESSING' | 'FULFILLED' | 'PARTIALLY_FULFILLED' | 'CANCELLED';
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  items: {
    id: string;
    productId: string;
    product: Product;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    lineTotal: number;
    fulfillmentStatus: string;
    allocations?: {
      id: string;
      warehouseId: string;
      warehouse: Warehouse;
      quantity: number;
      shippingCost: number;
    }[];
  }[];
  invoices?: Invoice[];
  subscriptions?: Subscription[];
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  order?: { id: string; orderNumber: string };
  customerId: string;
  customer: Customer;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  dueDate?: string;
  issuedAt: string;
  paidAt?: string;
  totalPaid: number;
  outstandingAmount: number;
  items: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxPercent: number;
    lineTotal: number;
  }[];
  payments: {
    id: string;
    amount: number;
    paymentMethod: string;
    reference?: string;
    paymentDate: string;
    recordedBy: { id: string; name: string };
  }[];
}

export interface Subscription {
  id: string;
  orderId: string;
  order?: { id: string; orderNumber: string };
  customerId: string;
  customer: Customer;
  productId: string;
  product: Product;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
  billingInterval: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  quantity: number;
  unitPrice: number;
  startDate: string;
  nextBillingDate: string;
  cancelledAt?: string;
  schedules: {
    id: string;
    billingDate: string;
    amount: number;
    status: 'SCHEDULED' | 'INVOICED' | 'PAID' | 'CANCELLED';
  }[];
}

export interface DealHealthAlerts {
  stalledDeals: {
    id: string;
    quoteNumber: string;
    customerName: string;
    repName: string;
    status: string;
    totalAmount: number;
    daysInactive: number;
    severity: 'HIGH' | 'MEDIUM';
    recommendation: string;
  }[];
  discountAnomalies: {
    id: string;
    quoteNumber: string;
    customerName: string;
    repName: string;
    quoteDiscountPercent: number;
    repHistoricalAvg: number;
    excessFactor: number;
    totalAmount: number;
    severity: 'CRITICAL' | 'WARNING';
    recommendation: string;
  }[];
  fulfillmentAlerts: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    productName: string;
    requestedQuantity: number;
    fulfillmentStatus: string;
    severity: string;
    recommendation: string;
  }[];
  counts: {
    stalledCount: number;
    anomalyCount: number;
    fulfillmentRiskCount: number;
  };
}
