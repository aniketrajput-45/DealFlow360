import { prisma } from '../../config/prisma';
import { FulfillmentEngineService } from '../fulfillment/fulfillment.service';
import { AuditService } from '../audit/audit.service';

export class OrderService {
  /**
   * Converts an approved or customer-accepted quotation into a confirmed business Order.
   * Preserves historical commercial terms and triggers hybrid fulfillment & billing.
   */
  static async convertQuoteToOrder(quotationId: string, actorUserId: string) {
    const quote = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    if (!quote) {
      throw new Error(`Quotation ${quotationId} not found.`);
    }

    if (quote.status !== 'APPROVED' && quote.status !== 'ACCEPTED') {
      throw new Error(`Only APPROVED or ACCEPTED quotations can be converted to an order. Current status: ${quote.status}`);
    }

    // Check if order already exists
    const existingOrder = await prisma.order.findUnique({
      where: { quotationId },
    });
    if (existingOrder) {
      return existingOrder;
    }

    const orderCount = await prisma.order.count();
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`;

    // Execute atomic transaction for order, billing bifurcation, and status updates
    const createdOrder = await prisma.$transaction(async (tx) => {
      // 1. Create Order with snapshot items
      const order = await tx.order.create({
        data: {
          orderNumber,
          quotationId: quote.id,
          customerId: quote.customerId,
          status: 'CONFIRMED',
          subtotal: quote.subtotal,
          discountAmount: quote.discountAmount,
          taxAmount: quote.taxAmount,
          totalAmount: quote.totalAmount,
          items: {
            create: quote.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discountPercent: i.discountPercent,
              discountAmount: i.discountAmount,
              taxPercent: i.taxPercent,
              lineTotal: i.lineTotal,
              fulfillmentStatus: 'PENDING',
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });

      // 2. Mark quote as ACCEPTED if it wasn't already
      await tx.quotation.update({
        where: { id: quote.id },
        data: { status: 'ACCEPTED' },
      });

      // 3. Bifurcate items: ONE_TIME items -> Invoice; RECURRING items -> Subscriptions
      const oneTimeItems = order.items.filter((item) => item.product.productType === 'ONE_TIME');
      const recurringItems = order.items.filter((item) => item.product.productType === 'RECURRING');

      // Create Invoice for One-Time items
      if (oneTimeItems.length > 0) {
        const invCount = await tx.invoice.count();
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invCount + 1).padStart(4, '0')}`;
        const invSubtotal = oneTimeItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice - i.discountAmount), 0);
        const invTax = oneTimeItems.reduce((sum, i) => sum + (i.lineTotal - (i.quantity * i.unitPrice - i.discountAmount)), 0);
        const invTotal = oneTimeItems.reduce((sum, i) => sum + i.lineTotal, 0);

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Net-30 payment terms

        await tx.invoice.create({
          data: {
            invoiceNumber,
            orderId: order.id,
            customerId: order.customerId,
            status: 'ISSUED',
            subtotal: Math.round(invSubtotal * 100) / 100,
            taxAmount: Math.round(invTax * 100) / 100,
            totalAmount: Math.round(invTotal * 100) / 100,
            dueDate,
            items: {
              create: oneTimeItems.map((item) => ({
                productId: item.productId,
                description: `${item.product.name} (Qty: ${item.quantity})`,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxPercent: item.taxPercent,
                lineTotal: item.lineTotal,
              })),
            },
          },
        });
      }

      // Create Subscriptions and Billing Schedules for Recurring items
      for (const rec of recurringItems) {
        const nextBilling = new Date();
        nextBilling.setMonth(nextBilling.getMonth() + 1); // 1 month ahead

        const subscription = await tx.subscription.create({
          data: {
            orderId: order.id,
            customerId: order.customerId,
            productId: rec.productId,
            status: 'ACTIVE',
            billingInterval: rec.product.billingInterval || 'MONTHLY',
            quantity: rec.quantity,
            unitPrice: rec.unitPrice,
            startDate: new Date(),
            nextBillingDate: nextBilling,
          },
        });

        // Generate initial scheduled recurring billing event
        await tx.billingSchedule.create({
          data: {
            subscriptionId: subscription.id,
            billingDate: nextBilling,
            amount: rec.lineTotal,
            status: 'SCHEDULED',
          },
        });
      }

      return order;
    });

    // 4. Run warehouse fulfillment allocation outside transaction
    try {
      await FulfillmentEngineService.allocateOrder(createdOrder.id);
    } catch (allocErr) {
      console.warn('[OrderService] Warning: Auto-fulfillment allocation deferred:', allocErr);
    }

    // 5. Append-only Audit Log
    await AuditService.record({
      userId: actorUserId,
      action: 'ORDER_CONFIRMED_FROM_QUOTE',
      entityType: 'Order',
      entityId: createdOrder.id,
      details: {
        orderNumber: createdOrder.orderNumber,
        quotationId: quote.id,
        quoteNumber: quote.quoteNumber,
        totalAmount: createdOrder.totalAmount,
      },
    });

    return createdOrder;
  }
}
