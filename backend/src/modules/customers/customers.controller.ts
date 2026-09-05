import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    // If customer role, restrict only to their own organization
    const customerFilter = req.user?.role === 'CUSTOMER' && req.user.customerId
      ? { id: req.user.customerId }
      : {};

    const customers = await prisma.customer.findMany({
      where: {
        isActive: true,
        ...customerFilter,
      },
      include: {
        tier: true,
        quotations: {
          select: { id: true, status: true, totalAmount: true },
        },
      },
      orderBy: { companyName: 'asc' },
    });

    const formatted = customers.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      contactName: c.contactName,
      email: c.email,
      phone: c.phone,
      address: c.address,
      tier: {
        id: c.tier.id,
        name: c.tier.name,
        maxDiscountPercent: c.tier.maxDiscountPercent,
      },
      stats: {
        totalQuotes: c.quotations.length,
        activeQuotes: c.quotations.filter((q) => ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'NEGOTIATION'].includes(q.status)).length,
        totalValue: c.quotations.reduce((sum, q) => sum + q.totalAmount, 0),
      },
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch customers.' });
  }
};

export const getTiers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tiers = await prisma.customerTier.findMany({
      where: { isActive: true },
      orderBy: { maxDiscountPercent: 'asc' },
    });

    res.json(tiers);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch customer tiers.' });
  }
};

export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Boundary check for customer role
    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== id) {
      res.status(403).json({ error: 'Access denied. You can only view your own organization.' });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        tier: true,
        quotations: {
          include: {
            items: { include: { product: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        orders: true,
        invoices: true,
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }

    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch customer details.' });
  }
};
