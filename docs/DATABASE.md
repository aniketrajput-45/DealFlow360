# DealFlow360 — Database Design

## 1. Database

DealFlow360 uses PostgreSQL as the primary relational database.

Prisma is used as the ORM.

The database is organized around the following domains:

1. Identity
2. Customer & Pricing
3. Inventory
4. Deal Lifecycle
5. Order & Fulfillment
6. Billing
7. System & Audit

---

# 2. Identity

## 2.1 Role

Represents the role assigned to a system user.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | enum | User role |
| description | string | Role description |

### Roles

- ADMIN
- SALES_REP
- SALES_MANAGER
- FINANCE
- WAREHOUSE
- CUSTOMER

### Relationships

- One Role → Many Users

---

## 2.2 User

Represents an authenticated system user.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | string | User's name |
| email | string | Unique login email |
| passwordHash | string | Hashed password |
| roleId | UUID | Associated role |
| customerId | UUID nullable | Associated customer for customer users |
| isActive | boolean | Account status |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Relationships

- Many Users → One Role
- Customer users may belong to One Customer
- One User may create Many Quotations
- One User may perform Many Approval Actions
- One User may create Many Audit Logs

---

# 3. Customer & Pricing

## 3.1 CustomerTier

Defines the maximum standard discount available to a customer tier.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | string | Tier name |
| maxDiscountPercent | decimal | Maximum standard discount |
| description | string nullable | Tier description |
| isActive | boolean | Whether the tier is active |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Example

| Tier | Maximum Discount |
|---|---:|
| Bronze | 5% |
| Silver | 10% |
| Gold | 15% |

These values are configuration data and must not be hardcoded into the frontend.

### Relationships

- One CustomerTier → Many Customers

---

## 3.2 Customer

Represents a buyer organization using the platform.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| companyName | string | Customer company |
| contactName | string | Primary contact |
| email | string | Contact email |
| phone | string nullable | Contact phone |
| address | string nullable | Customer address |
| tierId | UUID | Customer tier |
| isActive | boolean | Customer status |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Relationships

- Many Customers → One CustomerTier
- One Customer → Many Users
- One Customer → Many Quotations
- One Customer → Many Orders

# 4. Product & Pricing

## 4.1 ProductCategory

Represents the category of a product or service.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | string | Category name |
| description | string nullable | Category description |
| isActive | boolean | Whether the category is active |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Examples

- Hardware
- Services
- Software
- Subscription

### Relationships

- One ProductCategory → Many Products
- One ProductCategory → One or Many DiscountRules

## 4.2 Product

Represents a product, service, or subscription offering that can be included in a quotation.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | string | Product name |
| categoryId | UUID | Product category |
| description | string nullable | Product description |
| unit | string | Selling unit |
| basePrice | decimal | Default selling price |
| taxPercent | decimal | Applicable tax percentage |
| productType | enum | ONE_TIME or RECURRING |
| isActive | boolean | Whether the product is active |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Product Types

- ONE_TIME
- RECURRING

### Examples

Laptop:

- type: ONE_TIME
- base price: ₹80,000
- category: Hardware

Installation:

- type: ONE_TIME
- base price: ₹5,000
- category: Services

Premium Support:

- type: RECURRING
- base price: ₹2,000/month
- category: Subscription

### Relationships

- Many Products → One ProductCategory
- One Product → Many PricingRules
- One Product → Many QuotationItems
- One Product → Many OrderItems

## 4.3  PricingRule

Represents a pricing rule for a product under a particular customer tier or pricing context.

This allows the system to support customer-specific pricing without modifying the product's base price.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| productId | UUID | Product |
| customerTierId | UUID nullable | Applicable customer tier |
| price | decimal | Price under this rule |
| currency | string | Currency code |
| effectiveFrom | DateTime nullable | Rule start |
| effectiveTo | DateTime nullable | Rule end |
| isActive | boolean | Whether the rule is active |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Relationships

- Many PricingRules → One Product
- Many PricingRules → One CustomerTier

The base product price remains the fallback price when no applicable pricing rule exists.

## 4.4 DiscountRule

Represents a maximum allowed discount for a product category.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| categoryId | UUID | Product category |
| maxDiscountPercent | decimal | Maximum allowed category discount |
| approvalLevel | enum | Required approval level |
| isActive | boolean | Whether the rule is active |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Example

| Category | Maximum Discount |
|---|---:|
| Hardware | 15% |
| Services | 10% |

### Relationships

- Many DiscountRules → One ProductCategory

These rules are configuration data and must be evaluated by the backend approval/risk engine.

# 5. Warehouse & Inventory

## 5.1 Warehouse

Represents a physical location from which products can be fulfilled.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | string | Warehouse name |
| code | string | Unique warehouse code |
| address | string | Warehouse location |
| shippingCostWeight | decimal | Relative shipping-cost factor used during allocation |
| isActive | boolean | Whether the warehouse is active |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Example

| Warehouse | Shipping Weight |
|---|---:|
| Kolkata Warehouse | 1.0 |
| Delhi Warehouse | 1.4 |

A lower shipping-cost weight represents a more favorable shipping option.

### Relationships

- One Warehouse → Many Inventory records
- One Warehouse → Many WarehouseAllocations


## 5.2 Inventory

Represents the quantity of a particular product currently available in a warehouse.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| warehouseId | UUID | Warehouse |
| productId | UUID | Product |
| quantityAvailable | integer | Current available stock |
| reorderLevel | integer | Stock threshold for replenishment warning |
| updatedAt | DateTime | Last inventory update |

### Constraints

The combination of:

- warehouseId
- productId

must be unique.

This prevents duplicate inventory records for the same product in the same warehouse.

### Relationships

- Many Inventory records → One Warehouse
- Many Inventory records → One Product


## 5.3 Warehouse Allocation

Represents the quantity of an order item assigned to a specific warehouse.

This is created by the Fulfillment Engine after an order is accepted.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| orderItemId | UUID | Order item being fulfilled |
| warehouseId | UUID | Selected warehouse |
| quantity | integer | Quantity allocated |
| shippingCost | decimal | Calculated shipping cost for this allocation |
| createdAt | DateTime | Allocation timestamp |

### Relationships

- Many WarehouseAllocations → One OrderItem
- Many WarehouseAllocations → One Warehouse


## 5.4 Fulfillment Allocation Logic

Warehouse allocation is performed by the backend Fulfillment Engine.

The engine considers:

1. Required quantity
2. Available inventory
3. Active warehouses
4. Shipping-cost weighting

The engine attempts to fulfill the order using suitable warehouse inventory.

If one warehouse cannot satisfy the required quantity, the order item may be split across multiple warehouses.

### Example

Required quantity:

10 laptops

Available inventory:

Warehouse A → 6
Warehouse B → 20

Possible allocation:

Warehouse A → 6
Warehouse B → 4

The allocation is stored as separate WarehouseAllocation records.

The frontend must display the allocation generated by the backend rather than deciding the allocation itself.


## 5.5 Fulfillment Relationship

The fulfillment relationship is:

Order
  ↓
OrderItem
  ↓
WarehouseAllocation
  ↓
Warehouse
  ↓
Inventory
  ↓
Product

WarehouseAllocation represents the actual quantity of a specific order item assigned to a warehouse.

# 6. Deal Lifecycle

## 6.1 Quotation

Represents a sales quotation created for a customer.

The quotation is the central business object of DealFlow360.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| quoteNumber | string | Unique human-readable quote number |
| customerId | UUID | Customer receiving the quotation |
| createdById | UUID | User who created the quotation |
| status | enum | Current quotation status |
| subtotal | decimal | Total before discount and tax |
| discountAmount | decimal | Total discount amount |
| taxAmount | decimal | Total tax amount |
| totalAmount | decimal | Final quotation amount |
| totalMargin | decimal | Calculated quote margin |
| riskScore | decimal | Calculated blended risk score |
| requiredApprovalLevel | enum | Highest approval level required |
| validUntil | DateTime nullable | Quotation expiry date |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Quotation Status

Possible states:

- DRAFT
- PENDING_APPROVAL
- APPROVED
- REJECTED
- NEGOTIATION
- ACCEPTED
- EXPIRED
- CANCELLED

### Relationships

- Many Quotations → One Customer
- Many Quotations → One User
- One Quotation → Many QuotationItems
- One Quotation → Many Approvals
- One Quotation → Many Negotiations
- One Quotation → One Order after acceptance


## 6.2 QuotationItem

Represents a specific product or service included in a quotation.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| quotationId | UUID | Parent quotation |
| productId | UUID | Product |
| quantity | integer | Requested quantity |
| unitPrice | decimal | Price used for this quote |
| discountPercent | decimal | Applied discount percentage |
| discountAmount | decimal | Calculated discount amount |
| taxPercent | decimal | Applied tax percentage |
| lineSubtotal | decimal | Quantity × unit price |
| lineTotal | decimal | Final line amount |
| marginAmount | decimal | Calculated line margin |
| riskPoints | decimal | Risk contributed by this line |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Relationships

- Many QuotationItems → One Quotation
- Many QuotationItems → One Product

The unit price and discount used in a quotation should be stored on the quotation item.

This preserves the commercial terms that were actually offered even if the product's current price changes later.


## 6.3 Approval

Represents an approval requirement generated for a quotation.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| quotationId | UUID | Quotation requiring approval |
| approvalLevel | enum | Required approval level |
| status | enum | Approval status |
| assignedToId | UUID nullable | User responsible for approval |
| riskScore | decimal | Risk score at time of approval |
| reason | string | Why approval is required |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Approval Levels

- SALES_MANAGER
- FINANCE
- SALES_MANAGER_AND_FINANCE

### Approval Status

- PENDING
- APPROVED
- REJECTED

### Relationships

- Many Approvals → One Quotation
- Approval may be assigned to One User
- One Approval → Many ApprovalActions


## 6.4 ApprovalAction

Represents an individual action performed during an approval process.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| approvalId | UUID | Related approval |
| userId | UUID | User performing the action |
| action | enum | APPROVE or REJECT |
| reason | string nullable | Reason for the decision |
| createdAt | DateTime | Action timestamp |

### Relationships

- Many ApprovalActions → One Approval
- Many ApprovalActions → One User

Every approval or rejection must create an ApprovalAction record.

This provides an auditable approval history.


## 6.5 Negotiation

Represents a customer counter-offer or negotiation event associated with a quotation.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| quotationId | UUID | Related quotation |
| initiatedById | UUID | User/customer initiating the negotiation |
| previousDiscountPercent | decimal | Discount before counter-offer |
| proposedDiscountPercent | decimal | New requested discount |
| previousTotalAmount | decimal | Quote total before counter-offer |
| proposedTotalAmount | decimal | Recalculated quote total |
| riskScore | decimal | Risk calculated for the counter-offer |
| requiredApprovalLevel | enum nullable | Approval required for the counter-offer |
| status | enum | Negotiation status |
| message | string nullable | Negotiation message |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Negotiation Status

- PENDING
- APPROVED
- REJECTED
- ACCEPTED
- CANCELLED

### Relationships

- Many Negotiations → One Quotation
- Many Negotiations → One User

The initiating user may be a seller-side user or a customer user.


# 7. Quote and Approval Logic

## 7.1 Quote Creation

When a sales representative creates a quotation:

1. Customer is selected.
2. Products are added.
3. Applicable pricing rules are resolved.
4. Quantity and unit prices are recorded.
5. Discounts are applied.
6. Taxes are calculated.
7. Line margins are calculated.
8. Line-level risk is calculated.
9. The quotation-level blended risk is calculated.
10. Required approval level is determined.


## 7.2 Discount Evaluation

For each quotation item, the backend evaluates:

```text
Customer Tier Maximum Discount
              +
Product Category Maximum Discount
              +
Requested Discount
              ↓
        Discount Evaluation
              ↓
        Line Risk Points
```
## 7.3 Blended Risk Calculation

The quotation-level risk score is calculated from the risk contributed by all quotation items.

The system must not evaluate only the highest individual discount. Multiple smaller violations may contribute to the overall quotation risk.

The exact scoring formula and approval thresholds are configuration/business-rule decisions and will be documented in `BUSINESS_RULES.md`.

The backend Risk Engine is responsible for calculating the authoritative risk score.

---

## 7.4 Approval Routing

After risk calculation, the backend determines the highest approval level required.

Possible outcomes:

- No approval required
- Sales Manager approval
- Sales Manager + Finance approval

If multiple approval levels are required, all required approvals must be completed before the quotation becomes fully approved.

The frontend must never directly change a quotation to `APPROVED`.

---

## 7.5 Approval State Transition

```text
DRAFT
  |
  | Submit
  v
PENDING_APPROVAL
  |
  +-------> REJECTED
  |
  v
APPROVED
```

# 8. Order & Fulfillment

## 8.1 Order

Represents a confirmed business order created from an accepted quotation.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| orderNumber | string | Unique human-readable order number |
| quotationId | UUID | Source quotation |
| customerId | UUID | Customer |
| status | enum | Current order status |
| subtotal | decimal | Order subtotal |
| discountAmount | decimal | Total discount |
| taxAmount | decimal | Total tax |
| totalAmount | decimal | Final order amount |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Order Status

- CONFIRMED
- PROCESSING
- FULFILLED
- PARTIALLY_FULFILLED
- CANCELLED

### Relationships

- One Order → One Quotation
- Many Orders → One Customer
- One Order → Many OrderItems
- One Order → Many Invoices
- One Order → Many Subscriptions

The order must preserve the accepted commercial terms from the quotation.

---

## 8.2 OrderItem

Represents a product included in a confirmed order.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| orderId | UUID | Parent order |
| productId | UUID | Product |
| quantity | integer | Ordered quantity |
| unitPrice | decimal | Accepted unit price |
| discountPercent | decimal | Accepted discount |
| discountAmount | decimal | Discount amount |
| taxPercent | decimal | Applied tax |
| lineTotal | decimal | Final line amount |
| fulfillmentStatus | enum | Fulfillment status |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Fulfillment Status

- PENDING
- PARTIALLY_ALLOCATED
- ALLOCATED
- FULFILLED
- CANCELLED

### Relationships

- Many OrderItems → One Order
- Many OrderItems → One Product
- One OrderItem → Many WarehouseAllocations

---

## 8.3 Warehouse Allocation

Warehouse allocation records are created for individual OrderItems.

```text
Order
  |
  +-- OrderItem
        |
        +-- WarehouseAllocation
        |       |
        |       +-- Warehouse A → quantity 6
        |       |
        |       +-- Warehouse B → quantity 4
        |
        +-- Product
```



# 9. Billing

The Billing system manages invoices, recurring billing, payments, and billing-related financial state after a quotation is converted into an order.

DealFlow360 supports:

- One-time product billing
- Recurring subscription billing
- Invoice generation
- Partial payments
- Payment reconciliation
- Invoice status tracking
- Due dates and overdue handling
- Subscription billing schedules
- Billing audit logs

The backend is the authoritative source for all billing calculations and financial state.

---

## Invoice

An Invoice represents a billing document generated from a confirmed order.

### Invoice Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| invoiceNumber | string | Unique human-readable invoice number |
| orderId | UUID | Related order |
| customerId | UUID | Customer being billed |
| status | enum | Current invoice status |
| subtotal | decimal | Invoice subtotal before tax |
| taxAmount | decimal | Total tax amount |
| totalAmount | decimal | Final invoice amount |
| dueDate | DateTime nullable | Payment due date |
| issuedAt | DateTime | Invoice issue timestamp |
| paidAt | DateTime nullable | Payment completion timestamp |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Invoice Status

- DRAFT
- ISSUED
- PARTIALLY_PAID
- PAID
- OVERDUE
- CANCELLED

### Invoice Relationships

- Many Invoices → One Order
- Many Invoices → One Customer
- One Invoice → Many InvoiceItems
- One Invoice → Many Payments

---

## InvoiceItem

InvoiceItem represents an individual product or service charge included in an invoice.

### InvoiceItem Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| invoiceId | UUID | Parent invoice |
| productId | UUID nullable | Related product |
| description | string | Billing description |
| quantity | integer | Quantity billed |
| unitPrice | decimal | Price per unit |
| taxPercent | decimal | Applied tax percentage |
| lineTotal | decimal | Final line amount |
| createdAt | DateTime | Creation timestamp |

InvoiceItems must preserve the actual values used when the invoice was generated.

Future changes to product prices, discounts, or tax rules must not change historical invoice values.

---

## Invoice Generation

Invoices are generated from confirmed orders.

```text
Accepted Quotation
        |
        v
Confirmed Order
        |
        v
Check Order Items
        |
        +----------------------+
        |                      |
        v                      v
    ONE_TIME              RECURRING
    Products              Products
        |                      |
        v                      v
 Invoice Items            Subscription
                              |
                              v
                       Billing Schedule
````

Before creating an invoice, the backend must validate:

* Order exists
* Order is in a valid billable state
* Customer exists
* Order contains valid items
* Product exists
* Product type is valid
* Quantity is valid
* Price is valid
* Tax information is valid

The frontend must not directly create or modify financial records.

---

## One-Time Billing

ONE_TIME products are billed through InvoiceItems.

For each applicable order item:

```text
Gross Line Amount =
    Quantity × Unit Price

Discount Amount =
    Gross Line Amount × Discount Percentage / 100

Taxable Amount =
    Gross Line Amount - Discount Amount

Tax Amount =
    Taxable Amount × Tax Percentage / 100

Line Total =
    Taxable Amount + Tax Amount
```

Example:

```text
Product       = Laptop
Quantity      = 10
Unit Price    = ₹80,000
Discount      = 10%
Tax           = 18%

Gross Line Amount = ₹8,00,000
Discount Amount   = ₹80,000
Taxable Amount    = ₹7,20,000
Tax Amount        = ₹1,29,600
Line Total        = ₹8,49,600
```

The invoice subtotal is:

```text
Invoice Subtotal =
    SUM(all taxable invoice item amounts)
```

The invoice tax is:

```text
Invoice Tax =
    SUM(all invoice item tax amounts)
```

The final invoice total is:

```text
Invoice Total =
    Invoice Subtotal + Invoice Tax
```

All financial calculations must be performed by the backend.

---

## Recurring Billing

RECURRING products are handled through the Subscription and BillingSchedule system.

When a recurring product is included in an accepted order:

1. Create the OrderItem.
2. Create the Subscription.
3. Determine the billing interval.
4. Determine the recurring unit price.
5. Calculate the billing amount.
6. Determine the next billing date.
7. Create the BillingSchedule.
8. Generate future invoices according to the schedule.

Supported billing intervals:

* MONTHLY
* QUARTERLY
* YEARLY

Basic recurring billing calculation:

```text
Billing Amount =
    Subscription Quantity × Subscription Unit Price
```

Recurring products must not be treated as normal one-time products for future billing periods.

---

## BillingSchedule

A BillingSchedule represents a scheduled recurring billing event.

### BillingSchedule Fields

| Field          | Type          | Description            |
| -------------- | ------------- | ---------------------- |
| id             | UUID          | Primary key            |
| subscriptionId | UUID          | Related subscription   |
| billingDate    | DateTime      | Scheduled billing date |
| amount         | decimal       | Amount scheduled       |
| status         | enum          | Billing status         |
| invoiceId      | UUID nullable | Generated invoice      |
| createdAt      | DateTime      | Creation timestamp     |
| updatedAt      | DateTime      | Last update timestamp  |

### Billing Schedule Status

* SCHEDULED
* INVOICED
* PAID
* FAILED
* CANCELLED

When a billing schedule becomes due:

```text
BillingSchedule
       |
       v
Check Billing Date
       |
       v
Check Subscription Status
       |
       +----------------------+
       |                      |
       v                      v
    ACTIVE              CANCELLED / EXPIRED
       |                      |
       v                      v
Generate Invoice          Cancel Schedule
       |
       v
Link Invoice
       |
       v
Mark Schedule as INVOICED
```

Cancelled or expired subscriptions must not generate future recurring invoices.

---

## Subscription Proration

Proration may be required when a subscription:

* Starts partway through a billing period
* Changes partway through a billing period
* Is cancelled partway through a billing period

The calculation should consider:

* Billing interval
* Subscription price
* Quantity
* Start date
* Effective change date
* Remaining billing period
* Used portion of the billing period

Conceptually:

```text
Full Billing Amount
        |
        v
Determine Billing Period
        |
        v
Calculate Period Rate
        |
        v
Determine Remaining Period
        |
        v
Calculate Prorated Amount
```

The exact proration formula will be defined in `BUSINESS_RULES.md`.

---

## Subscription Cancellation

When a subscription is cancelled:

```text
ACTIVE Subscription
        |
        v
Cancellation Request
        |
        v
Calculate Remaining Period
        |
        v
Apply Cancellation Rules
        |
        +---- No Refund
        |
        +---- Partial Refund
        |
        +---- Other Adjustment
        |
        v
Subscription = CANCELLED
```

The system must:

* Record cancellation timestamp
* Change subscription status to CANCELLED
* Stop future billing schedules
* Calculate applicable refund or proration
* Record required financial adjustments
* Create an audit log

The exact cancellation and refund rules will be defined in `BUSINESS_RULES.md`.

---

## Payments

The MVP does not require an external payment gateway.

DealFlow360 supports manually recording payments against invoices.

### Payment Fields

| Field         | Type            | Description            |
| ------------- | --------------- | ---------------------- |
| id            | UUID            | Primary key            |
| invoiceId     | UUID            | Invoice being paid     |
| amount        | decimal         | Payment amount         |
| paymentMethod | enum            | Payment method         |
| reference     | string nullable | Payment reference      |
| paymentDate   | DateTime        | Payment timestamp      |
| recordedById  | UUID            | User recording payment |
| createdAt     | DateTime        | Creation timestamp     |

### Payment Methods

* CASH
* BANK_TRANSFER
* CARD
* UPI
* OTHER

Payment flow:

```text
Invoice
   |
   v
Record Payment
   |
   +-- Amount
   +-- Payment Method
   +-- Reference
   +-- Payment Date
   |
   v
Create Payment
   |
   v
Recalculate Invoice Status
```

---

## Payment Reconciliation

After every payment, the backend calculates the total amount paid.

```text
Total Paid =
    SUM(all valid payments for invoice)
```

Invoice status is determined using:

```text
if Total Paid == 0
    Invoice = ISSUED

if Total Paid < Invoice Total
    Invoice = PARTIALLY_PAID

if Total Paid >= Invoice Total
    Invoice = PAID
```

When the invoice becomes PAID:

```text
paidAt = current timestamp
```

The frontend must never directly set an invoice to PAID.

---

## Partial Payments

Multiple payments can be recorded against the same invoice.

Example:

```text
Invoice Total = ₹1,00,000

Payment 1 = ₹30,000
Payment 2 = ₹20,000

Total Paid = ₹50,000

Invoice Status = PARTIALLY_PAID
```

After the final payment:

```text
Payment 3 = ₹50,000

Total Paid = ₹1,00,000

Invoice Status = PAID
```

The invoice status must always be derived from persisted payment records.

---

## Outstanding Amount

The outstanding amount is:

```text
Outstanding Amount =
    Invoice Total - Total Paid
```

Example:

```text
Invoice Total = ₹1,00,000
Total Paid    = ₹40,000

Outstanding Amount = ₹60,000
```

The backend must calculate this value.

---

## Overpayment Handling

The backend must validate payment amounts before recording them.

By default:

```text
Payment Amount <= Outstanding Amount
```

If:

```text
Payment Amount > Outstanding Amount
```

the backend should reject the payment unless the business rules explicitly allow overpayment.

---

## Invoice Due Date and Overdue Status

Invoices may contain an optional due date.

If:

```text
Current Date > Due Date
```

and:

```text
Invoice Status != PAID
```

the invoice may transition to:

```text
OVERDUE
```

```text
Current Date > Due Date
        |
        v
Is Invoice Paid?
        |
    +---+---+
    |       |
   YES      NO
    |       |
    v       v
  PAID   OVERDUE
```

A fully paid invoice must never become overdue.

---

## Invoice Immutability

Once an invoice has been issued, historical billing values must remain stable.

The following values must not be silently changed:

* Unit price
* Quantity
* Discount
* Tax percentage
* Line total
* Invoice subtotal
* Invoice tax
* Invoice total

Example:

```text
Product price when invoice was created = ₹80,000

Later product price = ₹85,000

Existing invoice price = ₹80,000
```

New product prices only affect future transactions.

---

## Billing Audit Trail

Important billing actions must create AuditLog records.

Examples:

* INVOICE_CREATED
* INVOICE_ISSUED
* INVOICE_CANCELLED
* PAYMENT_RECORDED
* INVOICE_PARTIALLY_PAID
* INVOICE_PAID
* INVOICE_MARKED_OVERDUE
* SUBSCRIPTION_CREATED
* SUBSCRIPTION_CANCELLED
* BILLING_SCHEDULE_CREATED
* BILLING_SCHEDULE_INVOICED

Each audit record should include:

* User
* Action
* Entity type
* Entity ID
* Timestamp
* Relevant details

---

## Billing Transaction Safety

Financial operations that modify multiple related records should be executed inside a database transaction.

For example, recording a payment may require:

```text
Create Payment
      +
Recalculate Invoice Status
      +
Update paidAt if required
      +
Create AuditLog
```

These operations should be handled atomically where appropriate.

The system must avoid inconsistent states such as:

```text
Payment exists
        +
Invoice status was not updated
```

or:

```text
Invoice marked PAID
        +
Payment record was not created
```

---

## Billing Source of Truth

PostgreSQL is the authoritative source of billing information.

The following values must be calculated and persisted by the backend:

* Invoice subtotal
* Invoice tax
* Invoice total
* Invoice status
* Payment amount
* Total amount paid
* Outstanding amount
* Subscription billing amount
* Billing schedule status
* Payment completion timestamp

The frontend is responsible only for:

* Displaying billing information
* Collecting user input
* Sending API requests
* Displaying backend responses
* Displaying validation and error messages

The frontend must never be considered the source of truth for financial calculations.

---

## Complete Billing Flow

```text
Accepted Quotation
        |
        v
Confirmed Order
        |
        +---------------------------+
        |                           |
        v                           v
   ONE_TIME                    RECURRING
   Products                    Products
        |                           |
        v                           v
 Generate Invoice             Create Subscription
        |                           |
        v                           v
 Invoice = ISSUED            Create BillingSchedule
        |                           |
        v                           v
 Record Payment              Billing Date Reached
        |                           |
        v                           v
Recalculate Status            Generate Invoice
        |                           |
        +------------+--------------+
                     |
                     v
              Payment Recorded
                     |
                     v
          Recalculate Invoice
                     |
             +-------+-------+
             |               |
             v               v
       PARTIALLY_PAID       PAID
             |               |
             v               v
     Await remaining       paidAt set
        payment
```

## Billing Rules Summary

1. Only confirmed orders can generate normal invoices.
2. ONE_TIME products are billed through InvoiceItems.
3. RECURRING products create Subscriptions.
4. Recurring Subscriptions create BillingSchedules.
5. BillingSchedules can generate future invoices.
6. Cancelled or expired subscriptions must not generate future recurring invoices.
7. Invoice values must preserve historical commercial terms.
8. Multiple partial payments are supported.
9. Invoice payment status is calculated by the backend.
10. Payment status must be derived from persisted payment records.
11. The frontend must not perform authoritative financial calculations.
12. Important billing actions must be recorded in AuditLog.
13. Related financial operations should use database transactions.
14. Payment amounts must be validated against the outstanding amount.
15. Invoice due dates must be respected when determining overdue status.
16. Subscription proration must follow the rules defined in `BUSINESS_RULES.md`.
17. Subscription cancellation and refund calculations must follow the rules defined in `BUSINESS_RULES.md`.
18. Historical invoice data must remain stable after issuance.
19. PostgreSQL is the authoritative source of billing state.
20. All financial state changes must be performed through backend business logic.

```
```

# 10. Subscriptions

## 10.1 Subscription

Represents a recurring service purchased as part of an order.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| orderId | UUID | Source order |
| customerId | UUID | Customer |
| productId | UUID | Recurring product |
| status | enum | Subscription status |
| billingInterval | enum | MONTHLY, QUARTERLY, or YEARLY |
| quantity | integer | Subscription quantity |
| unitPrice | decimal | Recurring unit price |
| startDate | DateTime | Subscription start |
| endDate | DateTime nullable | Subscription end |
| nextBillingDate | DateTime | Next billing date |
| cancelledAt | DateTime nullable | Cancellation timestamp |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Subscription Status

- ACTIVE
- PAUSED
- CANCELLED
- EXPIRED

### Billing Intervals

- MONTHLY
- QUARTERLY
- YEARLY

### Relationships

- Many Subscriptions → One Order
- Many Subscriptions → One Customer
- Many Subscriptions → One Product
- One Subscription → Many BillingSchedules

---

## 10.2 BillingSchedule

Represents an individual scheduled recurring billing event.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| subscriptionId | UUID | Related subscription |
| billingDate | DateTime | Scheduled billing date |
| amount | decimal | Amount scheduled |
| status | enum | Billing status |
| invoiceId | UUID nullable | Generated invoice |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Billing Schedule Status

- SCHEDULED
- INVOICED
- PAID
- FAILED
- CANCELLED

### Relationships

- Many BillingSchedules → One Subscription
- BillingSchedule may reference One Invoice

---

## 10.3 Subscription Proration

When a subscription starts or changes partway through a billing period, the system may calculate a prorated amount.

The calculation should consider:

- Billing interval
- Original billing period
- Remaining billing period
- Subscription price
- Quantity
- Effective date of the change

The proration calculation must be handled by backend billing logic.

The exact formula will be defined in `BUSINESS_RULES.md`.

---

## 10.4 Subscription Cancellation

When a subscription is cancelled, the system must record:

- Cancellation date
- Previous subscription status
- Remaining billing period
- Applicable refund or proration amount

The exact cancellation and refund rules will be defined in `BUSINESS_RULES.md`.

---

# 11. Payments

## 11.1 Payment

Represents a payment recorded against an invoice.

No external payment gateway is required for the MVP.

### Fields

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| invoiceId | UUID | Invoice being paid |
| amount | decimal | Payment amount |
| paymentMethod | enum | Payment method |
| reference | string nullable | Payment reference |
| paymentDate | DateTime | Payment timestamp |
| recordedById | UUID | User recording payment |
| createdAt | DateTime | Creation timestamp |

### Payment Methods

- CASH
- BANK_TRANSFER
- CARD
- UPI
- OTHER

### Relationships

- Many Payments → One Invoice
- Many Payments → One User

---

## 11.2 Payment and Invoice Status

When a payment is recorded, the backend recalculates the invoice payment status.

```text
Invoice
   |
   v
Calculate Total Paid
   |
   +---- Total Paid < Invoice Total
   |             |
   |             v
   |       PARTIALLY_PAID
   |
   +---- Total Paid >= Invoice Total
                 |
                 v
                PAID