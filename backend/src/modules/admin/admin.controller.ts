import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
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

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, roleName, customerId } = req.body;
    const adminUserId = req.user?.id;

    if (!name || !email || !roleName) {
      res.status(400).json({ error: 'name, email, and roleName are required.' });
      return;
    }

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      res.status(400).json({ error: `Invalid role specified: ${roleName}` });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: `User with email ${email} already exists.` });
      return;
    }

    const passwordHash = await bcrypt.hash(password || 'password123', 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roleId: role.id,
        customerId: customerId || null,
      },
      include: { role: true },
    });

    if (adminUserId) {
      await AuditService.record({
        userId: adminUserId,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: newUser.id,
        details: { email: newUser.email, role: roleName },
      });
    }

    res.status(201).json(newUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create user.' });
  }
};

export const createPricingRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, customerTierId, price, currency } = req.body;
    const adminUserId = req.user?.id;

    if (!productId || price === undefined) {
      res.status(400).json({ error: 'productId and price are required.' });
      return;
    }

    const rule = await prisma.pricingRule.create({
      data: {
        productId,
        customerTierId: customerTierId || null,
        price: parseFloat(price),
        currency: currency || 'INR',
      },
      include: {
        product: { select: { id: true, name: true, basePrice: true } },
        customerTier: { select: { id: true, name: true } },
      },
    });

    if (adminUserId) {
      await AuditService.record({
        userId: adminUserId,
        action: 'PRICING_RULE_CREATED',
        entityType: 'PricingRule',
        entityId: rule.id,
        details: { productId, customerTierId, price },
      });
    }

    res.status(201).json(rule);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create pricing rule.' });
  }
};

export const updatePricingRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { price, isActive } = req.body;
    const adminUserId = req.user?.id;

    const rule = await prisma.pricingRule.update({
      where: { id },
      data: {
        ...(price !== undefined ? { price: parseFloat(price) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      include: {
        product: { select: { id: true, name: true, basePrice: true } },
        customerTier: { select: { id: true, name: true } },
      },
    });

    if (adminUserId) {
      await AuditService.record({
        userId: adminUserId,
        action: 'PRICING_RULE_UPDATED',
        entityType: 'PricingRule',
        entityId: id,
        details: { price, isActive },
      });
    }

    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update pricing rule.' });
  }
};

export const deletePricingRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.id;

    await prisma.pricingRule.delete({ where: { id } });

    if (adminUserId) {
      await AuditService.record({
        userId: adminUserId,
        action: 'PRICING_RULE_DELETED',
        entityType: 'PricingRule',
        entityId: id,
      });
    }

    res.json({ message: 'Pricing rule deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete pricing rule.' });
  }
};

export const updateCustomerTierCeiling = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { maxDiscountPercent } = req.body;
    const adminUserId = req.user?.id;

    if (maxDiscountPercent === undefined || isNaN(parseFloat(maxDiscountPercent))) {
      res.status(400).json({ error: 'Valid maxDiscountPercent is required.' });
      return;
    }

    const updatedTier = await prisma.customerTier.update({
      where: { id },
      data: { maxDiscountPercent: parseFloat(maxDiscountPercent) },
    });

    if (adminUserId) {
      await AuditService.record({
        userId: adminUserId,
        action: 'TIER_CEILING_UPDATED',
        entityType: 'CustomerTier',
        entityId: id,
        details: { maxDiscountPercent },
      });
    }

    res.json(updatedTier);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update customer tier ceiling.' });
  }
};

export const updateCategoryDiscountRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // categoryId
    const { maxDiscountPercent, approvalLevel } = req.body;
    const adminUserId = req.user?.id;

    if (maxDiscountPercent === undefined || isNaN(parseFloat(maxDiscountPercent))) {
      res.status(400).json({ error: 'Valid maxDiscountPercent is required.' });
      return;
    }

    const existingRule = await prisma.discountRule.findFirst({
      where: { categoryId: id, isActive: true },
    });

    let rule;
    if (existingRule) {
      rule = await prisma.discountRule.update({
        where: { id: existingRule.id },
        data: {
          maxDiscountPercent: parseFloat(maxDiscountPercent),
          ...(approvalLevel ? { approvalLevel } : {}),
        },
      });
    } else {
      rule = await prisma.discountRule.create({
        data: {
          categoryId: id,
          maxDiscountPercent: parseFloat(maxDiscountPercent),
          approvalLevel: approvalLevel || 'SALES_MANAGER',
        },
      });
    }

    if (adminUserId) {
      await AuditService.record({
        userId: adminUserId,
        action: 'CATEGORY_DISCOUNT_RULE_UPDATED',
        entityType: 'DiscountRule',
        entityId: rule.id,
        details: { categoryId: id, maxDiscountPercent, approvalLevel },
      });
    }

    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update category discount rule.' });
  }
};

export const createUpsellRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sourceProductId, suggestedProductId, promotionTag, priority } = req.body;
    const adminUserId = req.user?.id;

    if (!sourceProductId || !suggestedProductId) {
      res.status(400).json({ error: 'sourceProductId and suggestedProductId are required.' });
      return;
    }

    const rule = await prisma.upsellRule.create({
      data: {
        sourceProductId,
        suggestedProductId,
        promotionTag: promotionTag || 'HOT COMBO',
        priority: priority ? parseInt(priority, 10) : 1,
      },
      include: {
        sourceProduct: { select: { id: true, name: true, basePrice: true } },
        suggestedProduct: { select: { id: true, name: true, basePrice: true, costPrice: true } },
      },
    });

    if (adminUserId) {
      await AuditService.record({
        userId: adminUserId,
        action: 'UPSELL_RULE_CREATED',
        entityType: 'UpsellRule',
        entityId: rule.id,
        details: { sourceProductId, suggestedProductId },
      });
    }

    res.status(201).json(rule);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create upsell rule.' });
  }
};

export const updateUpsellRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { promotionTag, priority, isActive } = req.body;
    const adminUserId = req.user?.id;

    const rule = await prisma.upsellRule.update({
      where: { id },
      data: {
        ...(promotionTag !== undefined ? { promotionTag } : {}),
        ...(priority !== undefined ? { priority: parseInt(priority, 10) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      include: {
        sourceProduct: { select: { id: true, name: true, basePrice: true } },
        suggestedProduct: { select: { id: true, name: true, basePrice: true, costPrice: true } },
      },
    });

    if (adminUserId) {
      await AuditService.record({
        userId: adminUserId,
        action: 'UPSELL_RULE_UPDATED',
        entityType: 'UpsellRule',
        entityId: id,
        details: { promotionTag, priority, isActive },
      });
    }

    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update upsell rule.' });
  }
};

export const deleteUpsellRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.id;

    await prisma.upsellRule.delete({ where: { id } });

    if (adminUserId) {
      await AuditService.record({
        userId: adminUserId,
        action: 'UPSELL_RULE_DELETED',
        entityType: 'UpsellRule',
        entityId: id,
      });
    }

    res.json({ message: 'Upsell rule deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete upsell rule.' });
  }
};
