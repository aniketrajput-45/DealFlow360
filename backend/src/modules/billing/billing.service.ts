import { prisma } from '../../config/prisma';
import { AuditService } from '../audit/audit.service';

export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  paymentDate?: Date;
  recordedById: string;
}

export class BillingService {
  /**
   * Records an incoming payment against an invoice and reconciles the invoice status atomically.
   */
  static async recordPayment(input: RecordPaymentInput) {
    const { invoiceId, amount, paymentMethod, reference, recordedById } = input;

    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found.`);
    }

    if (invoice.status === 'PAID') {
      throw new Error('This invoice has already been fully paid.');
    }

    const existingPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = Math.round((invoice.totalAmount - existingPaid) * 100) / 100;

    if (amount > outstanding) {
      throw new Error(
        `Payment amount (₹${amount.toLocaleString()}) exceeds the outstanding balance (₹${outstanding.toLocaleString()}).`
      );
    }

    const txResult = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount,
          paymentMethod,
          reference: reference || null,
          paymentDate: input.paymentDate || new Date(),
          recordedById,
        },
      });

      // 2. Reconcile new status
      const newTotalPaid = Math.round((existingPaid + amount) * 100) / 100;
      let newStatus = invoice.status;
      let paidAt = invoice.paidAt;

      if (newTotalPaid >= invoice.totalAmount) {
        newStatus = 'PAID';
        paidAt = new Date();
      } else if (newTotalPaid > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: newStatus,
          paidAt,
        },
        include: { payments: true, customer: true },
      });

      return { payment, updatedInvoice, newStatus, newTotalPaid };
    }, { timeout: 15000 });

    // 3. Append-only Audit Log (recorded after commit to prevent SQLite lock contention)
    await AuditService.record({
      userId: recordedById,
      action: txResult.newStatus === 'PAID' ? 'INVOICE_PAID_IN_FULL' : 'PAYMENT_RECORDED_PARTIAL',
      entityType: 'Invoice',
      entityId: invoiceId,
      details: {
        paymentAmount: amount,
        paymentMethod,
        reference,
        previousStatus: invoice.status,
        newStatus: txResult.newStatus,
        totalPaid: txResult.newTotalPaid,
        outstandingRemaining: Math.max(0, invoice.totalAmount - txResult.newTotalPaid),
      },
    });

    return { payment: txResult.payment, updatedInvoice: txResult.updatedInvoice };
  }

  /**
   * Cancels a subscription and calculates prorated refund/credit amount.
   */
  static async cancelSubscription(subscriptionId: string, actorUserId: string, reason?: string) {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { product: true, schedules: true },
    });

    if (!sub) {
      throw new Error(`Subscription ${subscriptionId} not found.`);
    }
    if (sub.status === 'CANCELLED') {
      throw new Error('Subscription is already cancelled.');
    }

    const now = new Date();
    const nextBill = new Date(sub.nextBillingDate);
    const msRemaining = Math.max(0, nextBill.getTime() - now.getTime());
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    const daysInMonth = 30;

    // Proration calculation:
    const monthlyAmount = sub.quantity * sub.unitPrice;
    const dailyRate = monthlyAmount / daysInMonth;
    const proratedRefund = Math.round(Math.min(monthlyAmount, daysRemaining * dailyRate) * 100) / 100;

    const cancelledSub = await prisma.$transaction(async (tx) => {
      // 1. Update subscription status
      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          endDate: now,
        },
      });

      // 2. Cancel future scheduled billing schedules
      await tx.billingSchedule.updateMany({
        where: {
          subscriptionId,
          status: 'SCHEDULED',
        },
        data: {
          status: 'CANCELLED',
        },
      });

      return updated;
    });

    // 3. Append to AuditLog
    await AuditService.record({
      userId: actorUserId,
      action: 'SUBSCRIPTION_CANCELLED_WITH_PRORATION',
      entityType: 'Subscription',
      entityId: subscriptionId,
      details: {
        reason,
        daysRemainingInCycle: daysRemaining,
        calculatedProratedRefund: proratedRefund,
      },
    });

    return {
      subscription: cancelledSub,
      daysRemainingInCycle: daysRemaining,
      calculatedProratedRefund: proratedRefund,
    };
  }
}
