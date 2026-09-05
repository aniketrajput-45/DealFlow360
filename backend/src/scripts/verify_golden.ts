import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  const usersCount = await prisma.user.count();
  const customersCount = await prisma.customer.count();
  const productsCount = await prisma.product.count();
  const categoriesCount = await prisma.productCategory.count();
  const warehousesCount = await prisma.warehouse.count();
  const quotationsCount = await prisma.quotation.count();
  const quoteItemsCount = await prisma.quotationItem.count();
  const approvalsCount = await prisma.approval.count();
  const ordersCount = await prisma.order.count();
  const allocationsCount = await prisma.warehouseAllocation.count();
  const invoicesCount = await prisma.invoice.count();
  const paymentsCount = await prisma.payment.count();
  const subscriptionsCount = await prisma.subscription.count();
  const negotiationsCount = await prisma.negotiation.count();
  const auditLogsCount = await prisma.auditLog.count();

  console.log('=== DATASET COUNTS ===');
  console.log(`Users: ${usersCount}`);
  console.log(`Customers: ${customersCount}`);
  console.log(`Products: ${productsCount}`);
  console.log(`Categories: ${categoriesCount}`);
  console.log(`Warehouses: ${warehousesCount}`);
  console.log(`Quotations: ${quotationsCount}`);
  console.log(`Quote Items: ${quoteItemsCount}`);
  console.log(`Approvals: ${approvalsCount}`);
  console.log(`Orders: ${ordersCount}`);
  console.log(`Warehouse Allocations: ${allocationsCount}`);
  console.log(`Invoices: ${invoicesCount}`);
  console.log(`Payments: ${paymentsCount}`);
  console.log(`Subscriptions: ${subscriptionsCount}`);
  console.log(`Negotiations: ${negotiationsCount}`);
  console.log(`Audit Logs: ${auditLogsCount}`);

  console.log('\n=== KEY RECORD IDENTIFIERS ===');
  const quotes = await prisma.quotation.findMany({ select: { id: true, quoteNumber: true, status: true } });
  console.log('Quotations:', quotes);

  const approvals = await prisma.approval.findMany({ select: { id: true, approvalLevel: true, status: true, quotationId: true } });
  console.log('Approvals:', approvals);

  const orders = await prisma.order.findMany({ select: { id: true, orderNumber: true, status: true } });
  console.log('Orders:', orders);

  const allocations = await prisma.warehouseAllocation.findMany({ include: { warehouse: true } });
  console.log('Allocations count:', allocations.length);
  for (const a of allocations) {
    console.log(`  - Allocation ${a.id}: Qty ${a.quantity} from ${a.warehouse.code}`);
  }

  const invoices = await prisma.invoice.findMany({ select: { id: true, invoiceNumber: true, status: true, totalAmount: true } });
  console.log('Invoices:', invoices);

  const subscriptions = await prisma.subscription.findMany({ select: { id: true, status: true, billingInterval: true } });
  console.log('Subscriptions:', subscriptions);

  const negotiations = await prisma.negotiation.findMany({ select: { id: true, proposedDiscountPercent: true, status: true } });
  console.log('Negotiations:', negotiations);
}

verify().finally(() => prisma.$disconnect());
