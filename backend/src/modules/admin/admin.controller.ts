import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { AuditService } from '../audit/audit.service';

export const getAdminStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      usersCount,
      customersCount,
      productsCount,
      quotationsCount,
      ordersCount,
      pendingApprovalsCount,
      invoices,
      subscriptionsCount,
      warehousesCount,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.quotation.count(),
      prisma.order.count({ where: { status: 'CONFIRMED' } }),
      prisma.approval.count({ where: { status: 'PENDING' } }),
      prisma.invoice.findMany({ where: { status: 'ISSUED' }, select: { totalAmount: true } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.warehouse.count({ where: { isActive: true } }),
      AuditService.getLogs({ limit: 10 }),
    ]);

    const outstandingInvoicesCount = invoices.length;

    res.json({
      totalUsers: usersCount,
      activeCustomers: customersCount,
      activeProducts: productsCount,
      totalQuotations: quotationsCount,
      activeOrders: ordersCount,
      pendingApprovals: pendingApprovalsCount,
      outstandingInvoices: outstandingInvoicesCount,
      activeSubscriptions: subscriptionsCount,
      warehouses: warehousesCount,
      recentAuditLogs,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch admin stats.' });
  }
};

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        customer: { select: { id: true, companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role.name,
      isActive: u.isActive,
      customerName: u.customer?.companyName || null,
      createdAt: u.createdAt,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch users.' });
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { roleName } = req.body;
    const adminUserId = req.user?.id;

    if (!roleName) {
      res.status(400).json({ error: 'roleName is required.' });
      return;
    }

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      res.status(400).json({ error: `Invalid role specified: ${roleName}` });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { roleId: role.id },
      include: { role: true },
    });

    if (adminUserId) {
      await AuditService.record({
        userId: adminUserId,
        action: 'USER_ROLE_UPDATED',
        entityType: 'User',
        entityId: id,
        details: { targetUserEmail: updatedUser.email, newRole: roleName },
      });
    }

    res.json({
      message: `User ${updatedUser.email} role updated to ${roleName}.`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role.name,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update user role.' });
  }
};

export const getPricingRules = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rules = await prisma.pricingRule.findMany({
      include: {
        product: { select: { id: true, name: true, basePrice: true } },
        customerTier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch pricing rules.' });
  }
};

export const getDiscountGovernance = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [tiers, categories] = await Promise.all([
      prisma.customerTier.findMany({ orderBy: { maxDiscountPercent: 'asc' } }),
      prisma.productCategory.findMany({
        include: { discountRules: { where: { isActive: true } } },
        orderBy: { name: 'asc' },
      }),
    ]);

    const categoryCeilings = categories.map((c) => ({
      categoryId: c.id,
      categoryName: c.name,
      maxDiscountPercent: c.discountRules[0]?.maxDiscountPercent ?? 10,
      approvalLevel: c.discountRules[0]?.approvalLevel ?? 'SALES_MANAGER',
    }));

    res.json({
      customerTiers: tiers,
      categoryCeilings,
      approvalRoutingRules: [
        {
          condition: 'Applied discount <= Min(Tier Limit, Category Ceiling)',
          requiredApproval: 'NONE',
          description: 'Auto-approved quotation; low risk score (0-20).',
        },
        {
          condition: 'Applied discount > Allowed Ceiling (Risk Score 1 - 20)',
          requiredApproval: 'SALES_MANAGER',
          description: 'Requires Sales Manager review and approval.',
        },
        {
          condition: 'Applied discount exceeds ceiling by > 7% OR Risk Score > 20',
          requiredApproval: 'SALES_MANAGER_AND_FINANCE',
          description: 'High-risk discount erosion. Requires two-step Sales Manager and Finance sign-off.',
        },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch discount governance.' });
  }
};

export const getUpsellRules = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rules = await prisma.upsellRule.findMany({
      include: {
        sourceProduct: { select: { id: true, name: true, basePrice: true } },
        suggestedProduct: { select: { id: true, name: true, basePrice: true, costPrice: true } },
      },
      orderBy: { priority: 'asc' },
    });

    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch upsell rules.' });
  }
};
