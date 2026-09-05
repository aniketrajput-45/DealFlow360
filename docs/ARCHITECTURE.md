# DealFlow360 — System Architecture

## 1. Architecture Overview

DealFlow360 is a B2B deal management platform that manages the lifecycle of a business deal between a seller and a buyer.

The system follows a modular monolith architecture.

The application consists of:

- React frontend
- Node.js/Express backend
- PostgreSQL database
- Modular business logic within the backend

The major business lifecycle is:

Quotation → Approval → Fulfillment → Billing → Payment

Customer negotiation can cause the quotation to be recalculated and re-approved.

---

## 2. High-Level Architecture

                         DEALFLOW360
                              |
             +----------------+----------------+
             |                                 |
             v                                 v
      Seller Application                 Customer Portal
             |                                 |
             +----------------+----------------+
                              |
                         REST API
                              |
                    Node.js + Express
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
   Authentication       Business Modules       Reporting
        |                     |
        |        +------------+------------+
        |        |            |            |
        |        v            v            v
        |     Quotes      Approvals   Negotiations
        |        |            |            |
        |        +------------+------------+
        |                     |
        |        +------------+------------+
        |        |            |            |
        |        v            v            v
        |   Fulfillment    Billing     Subscriptions
        |        |            |
        |        +------------+
        |                     |
        +---------------------+
                              |
                              v
                         PostgreSQL

---

## 3. Architecture Style

### Modular Monolith

The backend is deployed as a single application but internally divided into independent business modules.

This approach is selected because:

- The project needs to be implemented quickly.
- Core business logic is strongly interconnected.
- A single database simplifies transactional operations.
- It reduces deployment and debugging complexity.
- Modules remain logically separated and can be extracted into services in the future if required.

The MVP will NOT use microservices.

---

## 4. Frontend Architecture

The frontend will use:

- React
- TypeScript
- Vite
- Tailwind CSS

The frontend will provide two major experiences.

### Seller Application

Used by:

- Admin
- Sales Representative
- Sales Manager
- Finance
- Warehouse users

Main areas:

- Dashboard
- Customers
- Products & Pricing
- Quotations
- Approvals
- Negotiations
- Warehouses & Inventory
- Orders
- Billing
- Subscriptions
- Reports

### Customer Portal

A restricted customer-facing application/view.

Customers can:

- Sign in
- View their own quotations
- View quotation items and pricing
- Request a larger discount
- View negotiation status
- Accept quotations
- View orders
- View invoices
- View payment status

Customers must not have access to internal seller data such as:

- Other customers
- Internal approval rules
- Internal users
- Internal risk configuration
- Warehouse management
- Seller-side reports

---

## 5. Backend Architecture

The backend uses Node.js, Express, and TypeScript.

The backend is organized around business modules rather than one large collection of controllers.

backend/
└── src/
    ├── modules/
    │   ├── auth/
    │   ├── users/
    │   ├── customers/
    │   ├── products/
    │   ├── quotations/
    │   ├── approvals/
    │   ├── negotiations/
    │   ├── warehouses/
    │   ├── orders/
    │   ├── billing/
    │   ├── subscriptions/
    │   ├── payments/
    │   ├── reporting/
    │   └── audit/
    │
    ├── middleware/
    ├── config/
    ├── utils/
    └── app.ts

Each module should contain its own:

- Routes
- Controllers
- Services
- Validation
- Module-specific types

Business rules should live in services/domain logic rather than inside route handlers.

---

## 6. Core Business Engines

DealFlow360 contains several important business engines.

These engines are the core differentiators of the application.

### 6.1 Quote Engine

Responsible for:

- Creating quotations
- Managing quotation items
- Calculating line totals
- Applying discounts
- Calculating subtotal
- Calculating taxes
- Calculating final total
- Calculating margin-related values

The quotation is the central business object of the system.

---

### 6.2 Risk and Approval Engine

Responsible for determining whether a quotation requires approval.

Inputs include:

- Customer tier
- Product category
- Requested discount
- Configured discount limits
- Quote-level risk
- Margin/risk information

The engine must evaluate individual quote lines as well as the quotation as a whole.

Example:

Customer Tier
      +
Category Limit
      +
Requested Discount
      |
      v
Line Risk
      |
      v
Blended Quote Risk
      |
      v
Approval Level

The approval engine must route the quotation to the required approval level.

Possible approval levels include:

- No approval
- Sales Manager
- Sales Manager + Finance

The exact thresholds should be configurable rather than hardcoded into the frontend.

---

### 6.3 Fulfillment Engine

Responsible for determining how an accepted order should be fulfilled.

Inputs include:

- Ordered quantity
- Warehouse stock
- Warehouse availability
- Shipping-cost weighting

The engine may split an order across multiple warehouses.

Example:

Order requires 10 units

Warehouse A → 6 available
Warehouse B → 20 available

Result:

Warehouse A → 6
Warehouse B → 4

The allocation should be generated by backend business logic.

---

### 6.4 Billing Engine

Responsible for separating one-time and recurring charges.

Order
 |
 +---- One-time items ------> Invoice
 |
 +---- Recurring items -----> Subscription
                              |
                              v
                       Billing Schedule

The billing engine handles:

- Invoice generation
- Invoice totals
- Billing status
- Recurring billing schedules
- Subscription-related billing

---

### 6.5 Negotiation Engine

Responsible for customer counter-offers.

When a customer requests a larger discount:

Customer Counter-offer
          |
          v
Update Requested Discount
          |
          v
Risk Recalculation
          |
          v
Approval Required?
      /           \
    Yes            No
     |              |
     v              v
Approval        Continue
     |
     v
Updated Quote

A counter-offer must never bypass the normal approval rules.

---

## 7. Authentication and Authorization

Authentication identifies the user.

Authorization determines what the user is allowed to do.

The system will use role-based access control.

Primary roles:

- ADMIN
- SALES_REP
- SALES_MANAGER
- FINANCE
- WAREHOUSE
- CUSTOMER

Authorization must be enforced on the backend.

Frontend route protection alone is not sufficient.

---

## 8. Data Architecture

PostgreSQL will be the primary database.

Prisma will be used as the ORM.

The database will represent the major business entities and their relationships.

High-level domain model:

- User
- Role
- Customer
- CustomerTier
- Product
- ProductCategory
- PricingRule
- DiscountRule
- Warehouse
- Inventory
- Quotation
- QuotationItem
- Approval
- ApprovalAction
- Negotiation
- Order
- OrderItem
- WarehouseAllocation
- Invoice
- InvoiceItem
- Payment
- Subscription
- BillingSchedule
- AuditLog

Detailed database relationships and constraints will be documented separately in:

docs/DATABASE.md

---

## 9. API Architecture

The frontend communicates with the backend through REST APIs.

The API will be organized by business domain.

Examples:

/api/auth
/api/users
/api/customers
/api/products
/api/quotes
/api/approvals
/api/negotiations
/api/warehouses
/api/orders
/api/invoices
/api/subscriptions
/api/payments
/api/reports

Business operations must be performed by the backend.

The frontend must not implement authoritative business rules such as:

- Approval decisions
- Discount authorization
- Warehouse allocation
- Invoice status transitions
- Negotiation approval

The frontend may calculate/display values for user experience, but the backend remains the source of truth.

---

## 10. Transactional Consistency

Operations that modify multiple related records should use database transactions where necessary.

### Quote approval

Approve quotation
    |
    +-- Update approval
    +-- Update quotation status
    +-- Create audit log

These operations should be handled consistently.

### Order creation

Accepted quotation
    |
    +-- Create order
    +-- Create order items
    +-- Allocate inventory
    +-- Generate billing information

The system should avoid partially completed business operations.

---

## 11. Auditability

Important business actions must be recorded.

Audit events may include:

- Quote created
- Quote edited
- Discount changed
- Quote submitted for approval
- Approval granted
- Approval rejected
- Counter-offer submitted
- Quote accepted
- Order created
- Warehouse allocation created
- Invoice generated
- Payment recorded

Audit records should contain:

- Actor/user
- Action
- Related entity
- Timestamp
- Reason/details where applicable

---

## 12. Source of Truth

The backend and database are the authoritative source for business state.

Examples:

Discount approval
→ Backend

Risk calculation
→ Backend

Warehouse allocation
→ Backend

Invoice status
→ Backend

Payment status
→ Backend

Customer access
→ Backend authorization

The frontend should consume and display these results.

---

## 13. Error Handling

The backend should provide consistent API error responses.

The frontend should handle:

- Loading states
- Empty states
- Validation errors
- Authorization errors
- Server errors
- Success states

No important operation should silently fail.

---

## 14. Security Principles

The MVP should enforce:

- Password hashing
- Secure authentication
- HTTP-only authentication cookies
- Role-based authorization
- Input validation
- Server-side authorization checks
- Customer data isolation
- Protection against unauthorized quotation access

A customer must only be able to access resources belonging to that customer.

---

## 15. Scalability and Future Evolution

The MVP uses a modular monolith.

If the product grows significantly, individual modules can later be extracted into independent services.

Potential future services:

- Quote Service
- Approval Service
- Fulfillment Service
- Billing Service
- Notification Service
- Reporting Service

This is intentionally out of scope for the MVP.

---

## 16. Architecture Principles

The following principles must be followed during implementation:

1. Business rules belong in the backend.
2. Database state must be authoritative.
3. Frontend and backend contracts must remain synchronized.
4. Modules should have clear responsibilities.
5. Avoid unnecessary abstractions.
6. Avoid microservices for the MVP.
7. Do not hardcode business rules into UI components.
8. Important state transitions must be auditable.
9. Customer access must be strictly isolated.
10. Core business flows must be implemented end-to-end.
11. No fake implementations should remain in the completed MVP.
12. Prefer simple, maintainable solutions over unnecessary complexity.