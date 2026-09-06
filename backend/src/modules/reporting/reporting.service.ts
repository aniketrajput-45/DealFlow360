import { prisma } from '../../config/prisma';

export class ReportingService {
  /**
   * Generates deterministic, rule-based deal health metrics and anomaly alerts.
   */
  static async getDealHealthAndAlerts(user?: any) {
    const config = (await prisma.dealHealthConfig.findUnique({ where: { id: 'default' } })) || {
      stalledDaysThreshold: 3,
      anomalyDiscountMultiplier: 1.5,
    };

    const now = new Date();
    const stalledCutoff = new Date(now.getTime() - config.stalledDaysThreshold * 24 * 60 * 60 * 1000);

    let roleFilter: any = {};
    if (user?.role === 'SALES_REP') {
      roleFilter = { createdById: user.id };
    } else if (user?.role === 'CUSTOMER') {
      roleFilter = { customerId: user.customerId || 'NONE' };
    }

    // Fetch all active quotations with approvals
    const activeQuotes = await prisma.quotation.findMany({
      where: {
        status: { in: ['DRAFT', 'PENDING_APPROVAL', 'NEGOTIATION'] },
        ...roleFilter,
      },
      include: {
        customer: true,
        createdBy: true,
        items: true,
        approvals: {
          include: { actions: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 1. Rule-Based Stalled Deals Alert: Inactive for > stalledCutoff
    const stalledDeals = activeQuotes
      .filter((q) => new Date(q.updatedAt) < stalledCutoff)
      .map((q) => {
        const daysInactive = Math.floor((now.getTime() - new Date(q.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: q.id,
          quoteNumber: q.quoteNumber,
          customerName: q.customer.companyName,
          repName: q.createdBy.name,
          status: q.status,
          totalAmount: q.totalAmount,
          daysInactive,
          severity: daysInactive > 7 ? 'HIGH' : 'MEDIUM',
          recommendation: `No activity for ${daysInactive} days. Automated nudge recommended.`,
        };
      });

    // 2. Rule-Based Discount Anomaly Detection:
    // Compute each sales rep's historical average discount rate
    const allQuotesWithItems = await prisma.quotation.findMany({
      include: { items: true, createdBy: true },
    });

    const repDiscountMap = new Map<string, { totalDiscountAmt: number; totalSubtotal: number }>();
    for (const q of allQuotesWithItems) {
      const repId = q.createdById;
      const current = repDiscountMap.get(repId) || { totalDiscountAmt: 0, totalSubtotal: 0 };
      current.totalDiscountAmt += q.discountAmount;
      current.totalSubtotal += q.subtotal;
      repDiscountMap.set(repId, current);
    }

    const discountAnomalies = [];
    for (const q of activeQuotes) {
      const repStats = repDiscountMap.get(q.createdById);
      const repAvgDiscount = repStats && repStats.totalSubtotal > 0
        ? (repStats.totalDiscountAmt / repStats.totalSubtotal) * 100
        : 8.0; // Benchmark fallback

      const quoteDiscountPercent = q.subtotal > 0
        ? (q.discountAmount / q.subtotal) * 100
        : 0;

      // Anomaly trigger: quote discount exceeds rep's historical average by multiplier
      if (quoteDiscountPercent > repAvgDiscount * config.anomalyDiscountMultiplier && quoteDiscountPercent > 12) {
        // Check if sales manager approval has been granted
        const managerApproval = q.approvals?.find(
          (a) => a.approvalLevel === 'SALES_MANAGER' || a.approvalLevel === 'SALES_MANAGER_AND_FINANCE'
        );
        const hasManagerApproved = managerApproval
          ? managerApproval.actions?.some((act) => act.action === 'APPROVE') || managerApproval.status === 'APPROVED'
          : false;

        discountAnomalies.push({
          id: q.id,
          quoteNumber: q.quoteNumber,
          customerName: q.customer.companyName,
          repName: q.createdBy.name,
          status: q.status,
          requiredApprovalLevel: q.requiredApprovalLevel,
          hasManagerApproved,
          quoteDiscountPercent: Math.round(quoteDiscountPercent * 10) / 10,
          repHistoricalAvg: Math.round(repAvgDiscount * 10) / 10,
          excessFactor: Math.round((quoteDiscountPercent / Math.max(1, repAvgDiscount)) * 10) / 10,
          totalAmount: q.totalAmount,
          severity: quoteDiscountPercent > 20 ? 'CRITICAL' : 'WARNING',
          recommendation: `Discount (${Math.round(quoteDiscountPercent)}%) is ${Math.round((quoteDiscountPercent / repAvgDiscount) * 10) / 10}x higher than rep's average (${Math.round(repAvgDiscount)}%).`,
        });
      }
    }

    // 3. Delivery / Slippage Alerts: Orders with backordered items
    const backorderedItems = await prisma.orderItem.findMany({
      where: {
        fulfillmentStatus: { in: ['PENDING', 'PARTIALLY_ALLOCATED'] },
      },
      include: {
        order: { include: { customer: true } },
        product: true,
      },
    });

    const fulfillmentAlerts = backorderedItems.map((item) => ({
      orderId: item.orderId,
      orderNumber: item.order.orderNumber,
      customerName: item.order.customer.companyName,
      productName: item.product.name,
      requestedQuantity: item.quantity,
      fulfillmentStatus: item.fulfillmentStatus,
      severity: 'MEDIUM',
      recommendation: 'Partial stock fulfillment split active. Requires warehouse restock prompt.',
    }));

    return {
      stalledDeals,
      discountAnomalies,
      fulfillmentAlerts,
      counts: {
        stalledCount: stalledDeals.length,
        anomalyCount: discountAnomalies.length,
        fulfillmentRiskCount: fulfillmentAlerts.length,
      },
    };
  }

  /**
   * Generates high-level sales KPI overview and Kanban pipeline stages.
   */
  static async getSalesOverview(user?: any) {
    let quoteFilter: any = {};
    let customerFilter: any = {};
    if (user?.role === 'SALES_REP') {
      quoteFilter = { createdById: user.id };
    } else if (user?.role === 'CUSTOMER') {
      quoteFilter = { customerId: user.customerId || 'NONE' };
      customerFilter = { customerId: user.customerId || 'NONE' };
    }

    const quotes = await prisma.quotation.findMany({
      where: { ...quoteFilter },
      include: {
        customer: true,
        createdBy: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const orders = await prisma.order.findMany({
      where: {
        ...customerFilter,
        ...(user?.role === 'SALES_REP' ? { quotation: { createdById: user.id } } : {}),
      },
    });

    const invoices = await prisma.invoice.findMany({
      where: {
        ...customerFilter,
        ...(user?.role === 'SALES_REP' ? { order: { quotation: { createdById: user.id } } } : {}),
      },
      include: { payments: true },
    });

    const totalPipelineValue = quotes
      .filter((q) => ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'NEGOTIATION'].includes(q.status))
      .reduce((sum, q) => sum + q.totalAmount, 0);

    const totalConfirmedSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    let totalCollected = 0;
    for (const inv of invoices) {
      for (const p of inv.payments) {
        totalCollected += p.amount;
      }
    }

    const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmount, 0);

    // Kanban Stages:
    const pipeline = {
      DRAFT: quotes.filter((q) => q.status === 'DRAFT'),
      PENDING_APPROVAL: quotes.filter((q) => q.status === 'PENDING_APPROVAL'),
      NEGOTIATION: quotes.filter((q) => q.status === 'NEGOTIATION'),
      APPROVED: quotes.filter((q) => q.status === 'APPROVED'),
      ACCEPTED: quotes.filter((q) => q.status === 'ACCEPTED'),
    };

    return {
      metrics: {
        pipelineValue: Math.round(totalPipelineValue),
        totalSales: Math.round(totalConfirmedSales),
        totalInvoiced: Math.round(totalInvoiced),
        totalCollected: Math.round(totalCollected),
        outstandingReceivables: Math.round(Math.max(0, totalInvoiced - totalCollected)),
        totalQuotesCount: quotes.length,
        activeOrdersCount: orders.length,
      },
      pipeline,
    };
  }
}
