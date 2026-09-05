import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { BillingService } from './billing.service';

export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    let customerFilter: any = {};
    if (req.user?.role === 'CUSTOMER') {
      customerFilter = { customerId: req.user.customerId || 'NONE' };
    }

    const invoices = await prisma.invoice.findMany({
      where: { ...customerFilter },
      include: {
        customer: { select: { id: true, companyName: true, contactName: true, email: true } },
        order: { select: { id: true, orderNumber: true } },
        items: true,
        payments: {
          include: { recordedBy: { select: { id: true, name: true } } },
          orderBy: { paymentDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = invoices.map((inv) => {
      const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = Math.max(0, Math.round((inv.totalAmount - totalPaid) * 100) / 100);
      return {
        ...inv,
        totalPaid,
        outstandingAmount: outstanding,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch invoices.' });
  }
};

export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        order: { include: { quotation: true } },
        items: true,
        payments: {
          include: { recordedBy: { select: { id: true, name: true } } },
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    if (req.user?.role === 'CUSTOMER' && invoice.customerId !== req.user.customerId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstandingAmount = Math.max(0, Math.round((invoice.totalAmount - totalPaid) * 100) / 100);

    res.json({
      ...invoice,
      totalPaid,
      outstandingAmount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch invoice.' });
  }
};

export const recordPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoiceId, amount, paymentMethod = 'BANK_TRANSFER', reference } = req.body;
    const recordedById = req.user?.id;

    if (!recordedById || !invoiceId || amount === undefined) {
      res.status(400).json({ error: 'invoiceId and numeric amount are required.' });
      return;
    }

    const result = await BillingService.recordPayment({
      invoiceId,
      amount: parseFloat(amount),
      paymentMethod,
      reference,
      recordedById,
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record payment.' });
  }
};

export const getSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    let customerFilter: any = {};
    if (req.user?.role === 'CUSTOMER') {
      customerFilter = { customerId: req.user.customerId || 'NONE' };
    }

    const subs = await prisma.subscription.findMany({
      where: { ...customerFilter },
      include: {
        customer: { select: { id: true, companyName: true } },
        product: true,
        order: { select: { id: true, orderNumber: true } },
        schedules: { orderBy: { billingDate: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(subs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch subscriptions.' });
  }
};

export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const result = await BillingService.cancelSubscription(id, userId, reason);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to cancel subscription.' });
  }
};
