import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { OrderService } from './orders.service';

export const convertQuote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quotationId } = req.body;
    const userId = req.user?.id;

    if (!userId || !quotationId) {
      res.status(400).json({ error: 'quotationId is required.' });
      return;
    }

    const order = await OrderService.convertQuoteToOrder(quotationId, userId);
    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to convert quote to order.' });
  }
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    let customerFilter: any = {};
    if (req.user?.role === 'CUSTOMER') {
      customerFilter = { customerId: req.user.customerId || 'NONE' };
    }

    const orders = await prisma.order.findMany({
      where: { ...customerFilter },
      include: {
        customer: { select: { id: true, companyName: true, contactName: true } },
        quotation: { select: { id: true, quoteNumber: true } },
        items: {
          include: {
            product: true,
            allocations: { include: { warehouse: true } },
          },
        },
        invoices: true,
        subscriptions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch orders.' });
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: true,
        items: {
          include: {
            product: true,
            allocations: { include: { warehouse: true } },
          },
        },
        invoices: {
          include: { items: true, payments: true },
        },
        subscriptions: {
          include: { product: true, schedules: true },
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (req.user?.role === 'CUSTOMER' && order.customerId !== req.user.customerId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch order.' });
  }
};
