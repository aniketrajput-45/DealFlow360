# DealFlow360

## 1. Product Overview

DealFlow360 is a B2B deal management platform that manages the complete lifecycle of a business deal between a seller and a buyer.

Core lifecycle:

Quotation → Approval → Fulfillment → Billing → Payment

Customer negotiation can trigger re-evaluation and re-approval.

---

## 2. Core Actors

### Seller-side users
- Admin
- Sales Representative
- Sales Manager
- Finance
- Warehouse

### Buyer-side user
- Customer

Customers have restricted access to their own quotations, negotiations, orders, invoices, and payments.

---

## 3. Core Modules

- Authentication & Authorization
- User & Role Management
- Customer Management
- Customer Tiers
- Product & Category Management
- Pricing & Discount Rules
- Quotation Management
- Discount/Risk Engine
- Approval Workflow
- Customer Negotiation
- Warehouse & Inventory Management
- Order Management
- Billing & Invoicing
- Subscription Management
- Payment Recording
- Audit Logging
- Reporting & Dashboard

---

## 4. Core Business Flow

1. Sales representative creates a quotation.
2. Products/services/subscriptions are added.
3. Customer tier and discount rules are evaluated.
4. Discount/risk engine calculates the quote risk.
5. Required approval level is determined automatically.
6. Appropriate users approve/reject the quotation.
7. Customer can view the quotation through the customer portal.
8. Customer can submit a counter-offer.
9. Counter-offer triggers discount/risk recalculation.
10. Re-approval occurs when required.
11. Customer accepts the quotation.
12. Order is created.
13. Inventory is allocated across warehouses when necessary.
14. One-time items are invoiced.
15. Recurring items create subscriptions/billing schedules.
16. Payment is recorded.
17. Invoice status is updated.
18. Important actions are recorded in the audit log.

---

## 5. Important Business Rules

### Customer Discount Tiers

Example tiers:

- Bronze → 5%
- Silver → 10%
- Gold → 15%

### Category Discount Ceilings

Example:

- Hardware → 15%
- Services → 10%

The system must evaluate both customer-tier limits and category limits.

### Approval Routing

Discounts within allowed limits can proceed normally.

Discounts exceeding configured limits must generate risk and approval requirements.

The approval chain depends on the calculated risk/discount level.

### Blended Risk

A quotation containing multiple products/categories must be evaluated as a whole.

Multiple smaller discount violations may contribute to an overall blended risk score.

The quotation should be routed to the highest required approval level.

### Warehouse Allocation

Warehouse allocation considers:

- Required quantity
- Available stock
- Warehouse inventory
- Shipping-cost weighting

A single order may therefore be fulfilled from multiple warehouses.

### Billing

Orders can contain:

- One-time products/services
- Recurring subscription products

One-time items generate invoices.

Recurring items generate subscription billing schedules.

### Negotiation

A customer counter-offer must:

1. Update the requested discount.
2. Recalculate risk.
3. Determine whether approval is required.
4. Trigger approval when necessary.
5. Update the quotation after approval.

### Audit Trail

Important actions must record:

- User
- Action
- Timestamp
- Reason where applicable

---

## 6. Non-Goals

The MVP does NOT require:

- Public consumer marketplace
- Real payment gateway integration
- Microservices
- Machine-learning recommendation system
- Kubernetes/infrastructure complexity
- Multi-company support
- Multi-currency support

These may be considered future enhancements.

---

## 7. MVP Priority

Priority 1:
- Authentication
- Products
- Customers
- Quotations
- Discount/risk calculation
- Approval workflow
- Customer portal
- Negotiation
- Warehouse allocation
- Orders
- Invoices
- Payment recording

Priority 2:
- Subscriptions
- Upsell/cross-sell
- Reporting
- Advanced dashboard analytics

Priority 3:
- Multi-currency
- Multi-company
- Advanced recommendations
- Additional enterprise features