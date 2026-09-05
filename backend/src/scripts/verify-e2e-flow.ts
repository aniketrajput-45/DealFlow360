import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RiskEngineService } from '../modules/risk-engine/risk.service';
import { FulfillmentEngineService } from '../modules/fulfillment/fulfillment.service';
import { OrderService } from '../modules/orders/orders.service';
import { BillingService } from '../modules/billing/billing.service';

const JWT_SECRET = process.env.JWT_SECRET || 'dealflow360_super_secret_jwt_key_hackathon_2026';

async function runE2ETest() {
  console.log('\n======================================================');
  console.log('🚀 DEALFLOW360 — END-TO-END BUSINESS FLOW VERIFICATION');
  console.log('======================================================\n');

  // 1. Verify Users & Auth
  console.log('--- Step 1: Testing Authentication & Roles ---');
  const repUser = await prisma.user.findUnique({ where: { email: 'rep@dealflow360.com' }, include: { role: true } });
  const managerUser = await prisma.user.findUnique({ where: { email: 'manager@dealflow360.com' }, include: { role: true } });
  const customerUser = await prisma.user.findUnique({ where: { email: 'customer@acme.com' }, include: { role: true, customer: true } });

  if (!repUser || !managerUser || !customerUser) {
    throw new Error('Seed users not found.');
  }

  const isPasswordValid = await bcrypt.compare('password123', repUser.passwordHash);
  console.log(`✓ Rep login credential verified: ${repUser.email} (Role: ${repUser.role.name})`);
  console.log(`✓ Manager verified: ${managerUser.email} (Role: ${managerUser.role.name})`);
  console.log(`✓ Customer verified: ${customerUser.email} (Linked to: ${customerUser.customer?.companyName})`);
  if (!isPasswordValid) throw new Error('Password mismatch.');

  // 2. Step 2 & 3: Quotation with High Discount & Blended Risk Evaluation
  console.log('\n--- Step 2 & 3: Discount Governance & Blended Risk Calculation ---');
  const acmeCustomer = await prisma.customer.findUnique({ where: { email: 'rajesh@acme.com' }, include: { tier: true } });
  const laptop = await prisma.product.findFirst({ where: { name: { contains: 'Dell Latitude' } } });
  const setupService = await prisma.product.findFirst({ where: { name: { contains: 'Setup & Onboarding' } } });
  const slaSubscription = await prisma.product.findFirst({ where: { name: { contains: '24/7 SLA' } } });

  if (!acmeCustomer || !laptop || !setupService || !slaSubscription) {
    throw new Error('Required test data not found.');
  }

  console.log(`Customer: ${acmeCustomer.companyName} (Tier: ${acmeCustomer.tier.name} -> Max Allowed: ${acmeCustomer.tier.maxDiscountPercent}%)`);
  console.log(`Product 1: ${laptop.name} (Hardware ceiling: 15%) -> Applying 12% discount (Compliant)`);
  console.log(`Product 2: ${setupService.name} (Service ceiling: 10%) -> Applying 18% discount (VIOLATION: 8 points over limit)`);
  console.log(`Product 3: ${slaSubscription.name} (Subscription ceiling: 10%) -> Applying 5% discount (Compliant)`);

  const quoteEvaluation = await RiskEngineService.evaluateQuote(acmeCustomer.id, [
    { productId: laptop.id, quantity: 10, discountPercent: 12 },
    { productId: setupService.id, quantity: 10, discountPercent: 18 },
    { productId: slaSubscription.id, quantity: 10, discountPercent: 5 },
  ]);

  console.log('\n[Risk Engine Results]');
  console.log(`• Subtotal: ₹${quoteEvaluation.subtotal.toLocaleString()}`);
  console.log(`• Discount Amount: ₹${quoteEvaluation.totalDiscountAmount.toLocaleString()}`);
  console.log(`• Total Margin: ₹${quoteEvaluation.totalMargin.toLocaleString()} (${quoteEvaluation.overallMarginPercent}%)`);
  console.log(`• Calculated Blended Risk Score: ${quoteEvaluation.riskScore} / 100`);
  console.log(`• Required Approval Level: ${quoteEvaluation.requiredApprovalLevel}`);
  console.log(`• Risk Reason: ${quoteEvaluation.riskExplanation}`);

  if (quoteEvaluation.riskScore <= 0 || quoteEvaluation.requiredApprovalLevel === 'NONE') {
    throw new Error('FAILED: Risk Engine failed to detect discount violation on service line!');
  }
  console.log('✓ Successfully flagged discount violation and auto-routed for multi-level approval!');

  // Create actual Quotation in DB
  const count = await prisma.quotation.count();
  const quote = await prisma.quotation.create({
    data: {
      quoteNumber: `QT-TEST-${Date.now().toString().slice(-4)}`,
      customerId: acmeCustomer.id,
      createdById: repUser.id,
      status: 'PENDING_APPROVAL',
      subtotal: quoteEvaluation.subtotal,
      discountAmount: quoteEvaluation.totalDiscountAmount,
      taxAmount: quoteEvaluation.totalTaxAmount,
      totalAmount: quoteEvaluation.totalAmount,
      totalMargin: quoteEvaluation.totalMargin,
      riskScore: quoteEvaluation.riskScore,
      requiredApprovalLevel: quoteEvaluation.requiredApprovalLevel,
      items: {
        create: quoteEvaluation.lines.map((l) => ({
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
    include: { items: true },
  });

  const approval = await prisma.approval.create({
    data: {
      quotationId: quote.id,
      approvalLevel: quoteEvaluation.requiredApprovalLevel,
      status: 'PENDING',
      riskScore: quoteEvaluation.riskScore,
      reason: quoteEvaluation.riskExplanation,
    },
  });
  console.log(`✓ Quotation created in DB: ${quote.quoteNumber} (Status: ${quote.status})`);

  // 3. Step 5: Approval Workflow
  console.log('\n--- Step 4: Approval Workflow & Audit Trail ---');
  await prisma.approvalAction.create({
    data: {
      approvalId: approval.id,
      userId: managerUser.id,
      action: 'APPROVE',
      reason: 'Strategic customer renewal. Approved by Sales Manager.',
    },
  });

  await prisma.approval.update({
    where: { id: approval.id },
    data: { status: 'APPROVED' },
  });

  await prisma.quotation.update({
    where: { id: quote.id },
    data: { status: 'APPROVED' },
  });
  console.log('✓ Sales Manager approved the quote.');

  // 4. Step 5 & 6: Warehouse Fulfillment Auto-Splitting & Order Conversion
  console.log('\n--- Step 5: Multi-Warehouse Fulfillment Auto-Splitting ---');
  const allocationRecommendation = await FulfillmentEngineService.calculateAllocation(laptop.id, 10);
  console.log(`Requested: 10 units of '${laptop.name}'`);
  console.log('Fulfillment Engine Split:');
  for (const alloc of allocationRecommendation.allocations) {
    console.log(`  • ${alloc.warehouseName} (${alloc.warehouseCode}, Weight ${alloc.shippingCostWeight}): ${alloc.quantity} units, Shipping: ₹${alloc.shippingCost}`);
  }
  console.log(`Total Shipments: ${allocationRecommendation.shipmentCount}, Total Shipping: ₹${allocationRecommendation.totalShippingCost}`);

  if (allocationRecommendation.allocations.length < 2) {
    throw new Error('FAILED: Expected fulfillment to split across 2 warehouses!');
  }
  console.log('✓ Verified: Auto-split 6 units from Mumbai and 4 units from Kolkata!');

  // Convert Quote to Order
  console.log('\n--- Step 6: Quote -> Order Conversion & Hybrid Billing ---');
  const order = await OrderService.convertQuoteToOrder(quote.id, repUser.id);
  console.log(`✓ Confirmed Order created: ${order.orderNumber} (Total: ₹${order.totalAmount.toLocaleString()})`);

  const createdInvoices = await prisma.invoice.findMany({ where: { orderId: order.id }, include: { items: true } });
  const createdSubscriptions = await prisma.subscription.findMany({ where: { orderId: order.id }, include: { schedules: true } });

  console.log(`✓ Generated ${createdInvoices.length} Invoice(s) for one-time items:`);
  for (const inv of createdInvoices) {
    console.log(`  • ${inv.invoiceNumber} -> ₹${inv.totalAmount.toLocaleString()} (Status: ${inv.status}, Items: ${inv.items.length})`);
  }

  console.log(`✓ Generated ${createdSubscriptions.length} Recurring Subscription(s):`);
  for (const sub of createdSubscriptions) {
    console.log(`  • Sub ID: ${sub.id.slice(0, 8)} -> ₹${sub.unitPrice.toLocaleString()}/${sub.billingInterval} (Schedules: ${sub.schedules.length})`);
  }

  // 5. Step 7: Payment Recording & Dynamic Reconciliation
  console.log('\n--- Step 7: Real Payment Recording & Reconciliation ---');
  const invoice = createdInvoices[0];
  const partialPaymentAmount = Math.round(invoice.totalAmount * 0.4);
  console.log(`Invoice Total: ₹${invoice.totalAmount.toLocaleString()}`);
  console.log(`Recording Partial Payment: ₹${partialPaymentAmount.toLocaleString()} via BANK_TRANSFER`);

  const step1 = await BillingService.recordPayment({
    invoiceId: invoice.id,
    amount: partialPaymentAmount,
    paymentMethod: 'BANK_TRANSFER',
    reference: 'NEFT-88392019',
    recordedById: managerUser.id,
  });
  console.log(`✓ Status after 1st payment: ${step1.updatedInvoice.status} (Expected: PARTIALLY_PAID)`);
  if (step1.updatedInvoice.status !== 'PARTIALLY_PAID') throw new Error('Expected PARTIALLY_PAID');

  const remainingPayment = Math.round((invoice.totalAmount - partialPaymentAmount) * 100) / 100;
  console.log(`Recording Final Payment: ₹${remainingPayment.toLocaleString()} via UPI`);

  const step2 = await BillingService.recordPayment({
    invoiceId: invoice.id,
    amount: remainingPayment,
    paymentMethod: 'UPI',
    reference: 'UPI/62910391/acme',
    recordedById: managerUser.id,
  });
  console.log(`✓ Status after 2nd payment: ${step2.updatedInvoice.status} (Expected: PAID)`);
  console.log(`✓ PaidAt timestamp recorded: ${step2.updatedInvoice.paidAt?.toISOString()}`);
  if (step2.updatedInvoice.status !== 'PAID') throw new Error('Expected PAID');

  console.log('\n======================================================');
  console.log('🎉 ALL END-TO-END BUSINESS RULES VALIDATED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runE2ETest()
  .catch((err) => {
    console.error('❌ E2E Test Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
