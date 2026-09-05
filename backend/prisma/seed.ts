import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { RiskEngineService } from '../src/modules/risk-engine/risk.service';
import { OrderService } from '../src/modules/orders/orders.service';
import { AuditService } from '../src/modules/audit/audit.service';

const prisma = new PrismaClient();

async function main() {
  console.log('[Golden Seed] Starting deterministic database seed for DealFlow360...');

  // 0. Clean Database (Delete existing transactional & master data to prevent duplicates)
  console.log('[Golden Seed] Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.billingSchedule.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.warehouseAllocation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quoteComment.deleteMany();
  await prisma.negotiation.deleteMany();
  await prisma.approvalAction.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.upsellRule.deleteMany();
  await prisma.discountRule.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.customerTier.deleteMany();
  await prisma.role.deleteMany();
  await prisma.dealHealthConfig.deleteMany();

  // 1. Roles
  console.log('[Golden Seed] Creating RBAC Roles...');
  const roles = [
    { name: 'ADMIN', description: 'System Administrator with full setup and reporting access' },
    { name: 'SALES_REP', description: 'Sales Representative who builds quotes and manages customer deals' },
    { name: 'SALES_MANAGER', description: 'Sales Manager who reviews discounts and approves deals' },
    { name: 'FINANCE', description: 'Finance user who handles second-level approvals and billing' },
    { name: 'WAREHOUSE', description: 'Warehouse user managing fulfillment allocations' },
    { name: 'CUSTOMER', description: 'Restricted external customer portal user' },
  ];

  const roleMap = new Map<string, string>();
  for (const r of roles) {
    const role = await prisma.role.create({ data: r });
    roleMap.set(r.name, role.id);
  }

  // 2. Customer Tiers
  console.log('[Golden Seed] Creating Customer Tiers...');
  const tiers = [
    { name: 'Bronze', maxDiscountPercent: 5.0, description: 'Standard tier with up to 5% allowed discount' },
    { name: 'Silver', maxDiscountPercent: 10.0, description: 'Growth tier with up to 10% allowed discount' },
    { name: 'Gold', maxDiscountPercent: 15.0, description: 'Enterprise tier with up to 15% allowed discount' },
  ];

  const tierMap = new Map<string, string>();
  for (const t of tiers) {
    const tier = await prisma.customerTier.create({ data: t });
    tierMap.set(t.name, tier.id);
  }

  // 3. Customers
  console.log('[Golden Seed] Creating Customers...');
  const customersData = [
    {
      companyName: 'ABC Corp',
      contactName: 'Jane Doe',
      email: 'customer@abccorp.com',
      phone: '+1 (555) 123-4567',
      address: '100 Enterprise Way, Suite 400, San Jose, CA',
      tierId: tierMap.get('Gold')!,
    },
    {
      companyName: 'Nova Systems',
      contactName: 'Mark Vance',
      email: 'contact@novasystems.io',
      phone: '+1 (555) 987-6543',
      address: '45 Innovation Hub, Austin, TX',
      tierId: tierMap.get('Silver')!,
    },
    {
      companyName: 'Urban Retail',
      contactName: 'Sarah Jenkins',
      email: 'procurement@urbanretail.com',
      phone: '+1 (555) 246-8101',
      address: '782 Commercial Blvd, Chicago, IL',
      tierId: tierMap.get('Bronze')!,
    },
  ];

  const customerMap = new Map<string, any>();
  for (const c of customersData) {
    const cust = await prisma.customer.create({ data: c });
    customerMap.set(c.companyName, cust);
  }

  const passwordHash = await bcrypt.hash('password123', 10);
  const usersData = [
    {
      name: 'System Admin',
      email: 'admin@dealflow360.com',
      passwordHash,
      roleId: roleMap.get('ADMIN')!,
    },
    {
      name: 'Alex Rep',
      email: 'rep@dealflow360.com',
      passwordHash,
      roleId: roleMap.get('SALES_REP')!,
    },
    {
      name: 'Sarah Manager',
      email: 'manager@dealflow360.com',
      passwordHash,
      roleId: roleMap.get('SALES_MANAGER')!,
    },
    {
      name: 'David Finance',
      email: 'finance@dealflow360.com',
      passwordHash,
      roleId: roleMap.get('FINANCE')!,
    },
    {
      name: 'ABC Corp Contact',
      email: 'customer@abccorp.com',
      passwordHash,
      roleId: roleMap.get('CUSTOMER')!,
      customerId: customerMap.get('ABC Corp').id,
    },
  ];

  const userMap = new Map<string, any>();
  for (const u of usersData) {
    const user = await prisma.user.create({ data: u });
    userMap.set(u.email, user);
  }

  // 5. Product Categories
  console.log('[Golden Seed] Creating Product Categories...');
  const categoriesData = [
    { name: 'Hardware', description: 'Physical compute laptops, servers, and peripherals' },
    { name: 'Services', description: 'Professional deployment, migration, and technical services' },
    { name: 'Subscriptions', description: 'Recurring cloud licenses and support packages' },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const c = await prisma.productCategory.create({ data: cat });
    categoryMap.set(cat.name, c.id);
  }

  // 6. Category Discount Rules
  console.log('[Golden Seed] Creating Category Discount Rules...');
  const discountRulesData = [
    { categoryId: categoryMap.get('Hardware')!, maxDiscountPercent: 15.0, approvalLevel: 'SALES_MANAGER' },
    { categoryId: categoryMap.get('Services')!, maxDiscountPercent: 10.0, approvalLevel: 'SALES_MANAGER' },
    { categoryId: categoryMap.get('Subscriptions')!, maxDiscountPercent: 10.0, approvalLevel: 'SALES_MANAGER' },
  ];

  for (const dr of discountRulesData) {
    await prisma.discountRule.create({ data: dr });
  }

  // 7. Products
  console.log('[Golden Seed] Creating Products...');
  const productsData = [
    {
      name: 'Business Laptop',
      categoryId: categoryMap.get('Hardware')!,
      description: 'Standard 14" Business Laptop, 16GB RAM, 512GB SSD',
      unit: 'unit',
      basePrice: 80000,
      costPrice: 60000,
      taxPercent: 18,
      productType: 'ONE_TIME',
    },
    {
      name: 'Enterprise Laptop',
      categoryId: categoryMap.get('Hardware')!,
      description: 'High performance 16" Workstation Laptop, 32GB RAM, 1TB SSD',
      unit: 'unit',
      basePrice: 120000,
      costPrice: 90000,
      taxPercent: 18,
      productType: 'ONE_TIME',
    },
    {
      name: 'Monitor 27-inch',
      categoryId: categoryMap.get('Hardware')!,
      description: '4K IPS Ergonomic Office Monitor',
      unit: 'unit',
      basePrice: 25000,
      costPrice: 18000,
      taxPercent: 18,
      productType: 'ONE_TIME',
    },
    {
      name: 'Docking Station',
      categoryId: categoryMap.get('Hardware')!,
      description: 'Thunderbolt 4 Multi-Port Docking Station',
      unit: 'unit',
      basePrice: 12000,
      costPrice: 8000,
      taxPercent: 18,
      productType: 'ONE_TIME',
    },
    {
      name: 'Installation Service',
      categoryId: categoryMap.get('Services')!,
      description: 'On-site unpacking, assembly, OS configuration, and cable management',
      unit: 'package',
      basePrice: 15000,
      costPrice: 7000,
      taxPercent: 18,
      productType: 'ONE_TIME',
    },
    {
      name: 'Data Migration Service',
      categoryId: categoryMap.get('Services')!,
      description: 'Full migration of legacy files, profiles, and database configuration',
      unit: 'package',
      basePrice: 30000,
      costPrice: 14000,
      taxPercent: 18,
      productType: 'ONE_TIME',
    },
    {
      name: 'Premium Support',
      categoryId: categoryMap.get('Subscriptions')!,
      description: '24/7 Priority SLA response & dedicated TAM',
      unit: 'plan/month',
      basePrice: 5000,
      costPrice: 1200,
      taxPercent: 18,
      productType: 'RECURRING',
      billingInterval: 'MONTHLY',
    },
    {
      name: 'Cloud Backup',
      categoryId: categoryMap.get('Subscriptions')!,
      description: 'Automated encrypted cloud backup per user',
      unit: 'license/month',
      basePrice: 2500,
      costPrice: 600,
      taxPercent: 18,
      productType: 'RECURRING',
      billingInterval: 'MONTHLY',
    },
  ];

  const productMap = new Map<string, any>();
  for (const p of productsData) {
    const prod = await prisma.product.create({ data: p });
    productMap.set(p.name, prod);
  }

  // 8. Warehouses & Inventory Stock
  console.log('[Golden Seed] Creating Warehouses & Stocking Multi-Warehouse Inventory...');
  const warehousesData = [
    {
      name: 'Main Warehouse (Mumbai)',
      code: 'WH-MUM',
      address: 'Bhiwandi Logistics Hub, Mumbai, MH',
      shippingCostWeight: 1.0, // Primary warehouse
    },
    {
      name: 'East Depot (Kolkata)',
      code: 'WH-KOL',
      address: 'Dankuni Logistics Park, Kolkata, WB',
      shippingCostWeight: 1.4, // Secondary warehouse
    },
  ];

  const warehouseMap = new Map<string, any>();
  for (const wh of warehousesData) {
    const w = await prisma.warehouse.create({ data: wh });
    warehouseMap.set(wh.code, w);
  }

  // Exact stock numbers for multi-warehouse split testing:
  // Business Laptop: 6 in WH-MUM, 20 in WH-KOL (Total 26)
  // Monitor: 20 in WH-MUM, 10 in WH-KOL
  // Docking Station: 15 in WH-MUM, 20 in WH-KOL
  const inventoriesData = [
    { warehouseId: warehouseMap.get('WH-MUM').id, productId: productMap.get('Business Laptop').id, quantityAvailable: 6, reorderLevel: 5 },
    { warehouseId: warehouseMap.get('WH-KOL').id, productId: productMap.get('Business Laptop').id, quantityAvailable: 20, reorderLevel: 5 },
    { warehouseId: warehouseMap.get('WH-MUM').id, productId: productMap.get('Monitor 27-inch').id, quantityAvailable: 20, reorderLevel: 5 },
    { warehouseId: warehouseMap.get('WH-KOL').id, productId: productMap.get('Monitor 27-inch').id, quantityAvailable: 10, reorderLevel: 5 },
    { warehouseId: warehouseMap.get('WH-MUM').id, productId: productMap.get('Docking Station').id, quantityAvailable: 15, reorderLevel: 5 },
    { warehouseId: warehouseMap.get('WH-KOL').id, productId: productMap.get('Docking Station').id, quantityAvailable: 20, reorderLevel: 5 },
  ];

  for (const inv of inventoriesData) {
    await prisma.inventory.create({ data: inv });
  }

  // 9. Deal Health Config
  await prisma.dealHealthConfig.create({
    data: { id: 'default', stalledDaysThreshold: 3, anomalyDiscountMultiplier: 1.5 },
  });

  // Helper date utility for realistic timestamps across past weeks
  const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  };

  const repUser = userMap.get('rep@dealflow360.com');
  const managerUser = userMap.get('manager@dealflow360.com');
  const financeUser = userMap.get('finance@dealflow360.com');
  const customerUser = userMap.get('customer@abccorp.com');

  const abcCustomer = customerMap.get('ABC Corp');
  const novaCustomer = customerMap.get('Nova Systems');
  const urbanCustomer = customerMap.get('Urban Retail');

  console.log('[Golden Seed] Creating Golden Flow Transactions using Authoritative Business Logic Engines...');

  // -------------------------------------------------------------
  // GOLDEN FLOW 1 — NORMAL DEAL (Nova Systems)
  // -------------------------------------------------------------
  console.log('-> Flow 1: Normal Deal for Nova Systems');
  const flow1Items = [
    { productId: productMap.get('Business Laptop').id, quantity: 2, discountPercent: 5.0 },
    { productId: productMap.get('Installation Service').id, quantity: 1, discountPercent: 5.0 },
  ];
  const eval1 = await RiskEngineService.evaluateQuote(novaCustomer.id, flow1Items);

  const quote1 = await prisma.quotation.create({
    data: {
      quoteNumber: 'QT-2026-0001',
      customerId: novaCustomer.id,
      createdById: repUser.id,
      status: 'APPROVED', // Low risk auto-approved
      subtotal: eval1.subtotal,
      discountAmount: eval1.totalDiscountAmount,
      taxAmount: eval1.totalTaxAmount,
      totalAmount: eval1.totalAmount,
      totalMargin: eval1.totalMargin,
      riskScore: eval1.riskScore,
      requiredApprovalLevel: eval1.requiredApprovalLevel,
      createdAt: daysAgo(14),
      items: {
        create: eval1.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          costPrice: l.costPrice,
          discountPercent: l.discountPercent,
          discountAmount: l.discountAmount,
          taxPercent: l.taxPercent,
          lineSubtotal: l.lineSubtotal,
          lineTotal: l.lineTotal,
          marginAmount: l.marginAmount,
          riskPoints: l.riskPoints,
        })),
      },
    },
  });

  await OrderService.convertQuoteToOrder(quote1.id, repUser.id);
  console.log('   Quote1 Created & Converted to Order: QT-2026-0001');

  // -------------------------------------------------------------
  // GOLDEN FLOW 2, 3, 4, 5 — HIGH-RISK DEAL, APPROVAL, WAREHOUSE SPLIT & HYBRID BILLING (ABC Corp)
  // -------------------------------------------------------------
  console.log('-> Flow 2, 3, 4, 5: High-Risk Deal, Multi-Level Approval, Warehouse Split & Hybrid Billing for ABC Corp');
  const flow2Items = [
    { productId: productMap.get('Business Laptop').id, quantity: 10, discountPercent: 18.0 }, // Exceeds Gold 15% limit
    { productId: productMap.get('Installation Service').id, quantity: 10, discountPercent: 20.0 }, // Exceeds Services 10% limit
    { productId: productMap.get('Premium Support').id, quantity: 1, discountPercent: 10.0 },
  ];
  const eval2 = await RiskEngineService.evaluateQuote(abcCustomer.id, flow2Items);

  const quote2 = await prisma.quotation.create({
    data: {
      quoteNumber: 'QT-2026-0002',
      customerId: abcCustomer.id,
      createdById: repUser.id,
      status: 'APPROVED', // Will be approved through workflow
      subtotal: eval2.subtotal,
      discountAmount: eval2.totalDiscountAmount,
      taxAmount: eval2.totalTaxAmount,
      totalAmount: eval2.totalAmount,
      totalMargin: eval2.totalMargin,
      riskScore: eval2.riskScore,
      requiredApprovalLevel: eval2.requiredApprovalLevel,
      createdAt: daysAgo(7),
      items: {
        create: eval2.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          costPrice: l.costPrice,
          discountPercent: l.discountPercent,
          discountAmount: l.discountAmount,
          taxPercent: l.taxPercent,
          lineSubtotal: l.lineSubtotal,
          lineTotal: l.lineTotal,
          marginAmount: l.marginAmount,
          riskPoints: l.riskPoints,
        })),
      },
    },
  });

  // Approval record for quote 2
  const approval2 = await prisma.approval.create({
    data: {
      quotationId: quote2.id,
      approvalLevel: eval2.requiredApprovalLevel,
      status: 'APPROVED',
      riskScore: eval2.riskScore,
      reason: eval2.riskExplanation,
      createdAt: daysAgo(6),
      actions: {
        create: [
          { userId: managerUser.id, action: 'APPROVE', reason: 'Volume discount approved for Gold tier account', createdAt: daysAgo(6) },
          { userId: financeUser.id, action: 'APPROVE', reason: 'Margin verified and payment terms net-30 cleared', createdAt: daysAgo(5) },
        ],
      },
    },
  });

  // Convert to Order (Triggers Warehouse Split & Hybrid Billing)
  const order2 = await OrderService.convertQuoteToOrder(quote2.id, repUser.id);
  console.log(`   Quote2 Created (${quote2.quoteNumber}), Approved & Converted to Order (${order2.orderNumber})`);

  // -------------------------------------------------------------
  // GOLDEN FLOW 6 — CUSTOMER NEGOTIATION (ABC Corp Counter-Offer)
  // -------------------------------------------------------------
  console.log('-> Flow 6: Customer Negotiation & Counter-Offer');
  const flow6Items = [
    { productId: productMap.get('Enterprise Laptop').id, quantity: 3, discountPercent: 10.0 },
    { productId: productMap.get('Data Migration Service').id, quantity: 1, discountPercent: 10.0 },
  ];
  const eval6 = await RiskEngineService.evaluateQuote(abcCustomer.id, flow6Items);

  const quote6 = await prisma.quotation.create({
    data: {
      quoteNumber: 'QT-2026-0003',
      customerId: abcCustomer.id,
      createdById: repUser.id,
      status: 'NEGOTIATION',
      subtotal: eval6.subtotal,
      discountAmount: eval6.totalDiscountAmount,
      taxAmount: eval6.totalTaxAmount,
      totalAmount: eval6.totalAmount,
      totalMargin: eval6.totalMargin,
      riskScore: eval6.riskScore,
      requiredApprovalLevel: eval6.requiredApprovalLevel,
      createdAt: daysAgo(3),
      items: {
        create: eval6.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          costPrice: l.costPrice,
          discountPercent: l.discountPercent,
          discountAmount: l.discountAmount,
          taxPercent: l.taxPercent,
          lineSubtotal: l.lineSubtotal,
          lineTotal: l.lineTotal,
          marginAmount: l.marginAmount,
          riskPoints: l.riskPoints,
        })),
      },
    },
  });

  await prisma.negotiation.create({
    data: {
      quotationId: quote6.id,
      initiatedById: customerUser.id,
      previousDiscountPercent: 10.0,
      proposedDiscountPercent: 18.0,
      previousTotalAmount: eval6.totalAmount,
      proposedTotalAmount: eval6.totalAmount * 0.91,
      riskScore: 35.0,
      requiredApprovalLevel: 'SALES_MANAGER_AND_FINANCE',
      status: 'PENDING',
      message: 'Requesting an 18% counter-discount due to our quarterly volume commitment.',
      createdAt: daysAgo(2),
    },
  });

  await prisma.quoteComment.create({
    data: {
      quotationId: quote6.id,
      userId: customerUser.id,
      message: '[Counter-Offer] Proposed 18% discount for enterprise workstation package.',
      isCustomerVisible: true,
      createdAt: daysAgo(2),
    },
  });
  console.log('   Quote3 Created: QT-2026-0003 with Active Customer Counter-Offer');

  // -------------------------------------------------------------
  // GOLDEN FLOW 7 — ACCEPTANCE + PAYMENT (Nova Systems Invoice Paid)
  // -------------------------------------------------------------
  console.log('-> Flow 7: Acceptance + Payment (Paid Invoice)');
  // Fetch invoice generated for order 1
  const invoice1 = await prisma.invoice.findFirst({
    where: { customerId: novaCustomer.id },
  });

  if (invoice1) {
    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoice1.id,
        amount: invoice1.totalAmount,
        paymentMethod: 'BANK_TRANSFER',
        reference: 'UTR-9876543210',
        paymentDate: daysAgo(10),
        recordedById: financeUser.id,
      },
    });

    await prisma.invoice.update({
      where: { id: invoice1.id },
      data: {
        status: 'PAID',
        paidAt: daysAgo(10),
      },
    });

    await AuditService.record({
      userId: financeUser.id,
      action: 'PAYMENT_RECORDED',
      entityType: 'Invoice',
      entityId: invoice1.id,
      details: {
        amount: payment.amount,
        reference: payment.reference,
        invoiceNumber: invoice1.invoiceNumber,
      },
    });
    console.log(`   Invoice ${invoice1.invoiceNumber} updated to PAID with Payment ${payment.id}`);
  }

  // -------------------------------------------------------------
  // GOLDEN FLOW 8 — PENDING MANAGER APPROVAL (High Risk Pending)
  // -------------------------------------------------------------
  console.log('-> Flow 8: Pending Approval Deal for Sales Manager Queue');
  const flow8Items = [
    { productId: productMap.get('Enterprise Laptop').id, quantity: 5, discountPercent: 20.0 }, // High discount
  ];
  const eval8 = await RiskEngineService.evaluateQuote(urbanCustomer.id, flow8Items);

  const quote8 = await prisma.quotation.create({
    data: {
      quoteNumber: 'QT-2026-0004',
      customerId: urbanCustomer.id,
      createdById: repUser.id,
      status: 'PENDING_APPROVAL',
      subtotal: eval8.subtotal,
      discountAmount: eval8.totalDiscountAmount,
      taxAmount: eval8.totalTaxAmount,
      totalAmount: eval8.totalAmount,
      totalMargin: eval8.totalMargin,
      riskScore: eval8.riskScore,
      requiredApprovalLevel: eval8.requiredApprovalLevel,
      createdAt: daysAgo(1),
      items: {
        create: eval8.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          costPrice: l.costPrice,
          discountPercent: l.discountPercent,
          discountAmount: l.discountAmount,
          taxPercent: l.taxPercent,
          lineSubtotal: l.lineSubtotal,
          lineTotal: l.lineTotal,
          marginAmount: l.marginAmount,
          riskPoints: l.riskPoints,
        })),
      },
    },
  });

  await prisma.approval.create({
    data: {
      quotationId: quote8.id,
      approvalLevel: eval8.requiredApprovalLevel,
      status: 'PENDING',
      riskScore: eval8.riskScore,
      reason: eval8.riskExplanation,
      createdAt: daysAgo(1),
    },
  });
  console.log('   Quote4 Created: QT-2026-0004 Pending Manager Review');

  // -------------------------------------------------------------
  // GOLDEN FLOW 9 — REJECTED DEAL
  // -------------------------------------------------------------
  console.log('-> Flow 9: Rejected Deal');
  const flow9Items = [
    { productId: productMap.get('Docking Station').id, quantity: 10, discountPercent: 35.0 },
  ];
  const eval9 = await RiskEngineService.evaluateQuote(urbanCustomer.id, flow9Items);

  const quote9 = await prisma.quotation.create({
    data: {
      quoteNumber: 'QT-2026-0005',
      customerId: urbanCustomer.id,
      createdById: repUser.id,
      status: 'REJECTED',
      subtotal: eval9.subtotal,
      discountAmount: eval9.totalDiscountAmount,
      taxAmount: eval9.totalTaxAmount,
      totalAmount: eval9.totalAmount,
      totalMargin: eval9.totalMargin,
      riskScore: eval9.riskScore,
      requiredApprovalLevel: eval9.requiredApprovalLevel,
      createdAt: daysAgo(12),
      items: {
        create: eval9.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          costPrice: l.costPrice,
          discountPercent: l.discountPercent,
          discountAmount: l.discountAmount,
          taxPercent: l.taxPercent,
          lineSubtotal: l.lineSubtotal,
          lineTotal: l.lineTotal,
          marginAmount: l.marginAmount,
          riskPoints: l.riskPoints,
        })),
      },
    },
  });

  await prisma.approval.create({
    data: {
      quotationId: quote9.id,
      approvalLevel: eval9.requiredApprovalLevel,
      status: 'REJECTED',
      riskScore: eval9.riskScore,
      reason: eval9.riskExplanation,
      createdAt: daysAgo(12),
      actions: {
        create: [
          { userId: managerUser.id, action: 'REJECT', reason: 'Discount exceeds allowable gross margin threshold.', createdAt: daysAgo(11) },
        ],
      },
    },
  });
  console.log('   Quote5 Created & Rejected: QT-2026-0005');

  // -------------------------------------------------------------
  // GOLDEN FLOW 10 — DRAFT DEAL
  // -------------------------------------------------------------
  console.log('-> Flow 10: Draft Deal');
  const flow10Items = [
    { productId: productMap.get('Monitor 27-inch').id, quantity: 4, discountPercent: 5.0 },
  ];
  const eval10 = await RiskEngineService.evaluateQuote(novaCustomer.id, flow10Items);

  await prisma.quotation.create({
    data: {
      quoteNumber: 'QT-2026-0006',
      customerId: novaCustomer.id,
      createdById: repUser.id,
      status: 'DRAFT',
      subtotal: eval10.subtotal,
      discountAmount: eval10.totalDiscountAmount,
      taxAmount: eval10.totalTaxAmount,
      totalAmount: eval10.totalAmount,
      totalMargin: eval10.totalMargin,
      riskScore: eval10.riskScore,
      requiredApprovalLevel: eval10.requiredApprovalLevel,
      createdAt: daysAgo(1),
      items: {
        create: eval10.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          costPrice: l.costPrice,
          discountPercent: l.discountPercent,
          discountAmount: l.discountAmount,
          taxPercent: l.taxPercent,
          lineSubtotal: l.lineSubtotal,
          lineTotal: l.lineTotal,
          marginAmount: l.marginAmount,
          riskPoints: l.riskPoints,
        })),
      },
    },
  });
  console.log('   Quote6 Created: QT-2026-0006 Draft Proposal');

  console.log('\n[Golden Seed] Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Golden Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
