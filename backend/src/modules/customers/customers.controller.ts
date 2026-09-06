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

export const getCustomerGrowthOpportunities = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // RBAC & Ownership boundary check:
    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== id) {
      res.status(403).json({ error: 'Access denied. You can only access opportunities for your account.' });
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
        },
        orders: {
          include: {
            items: { include: { product: true } },
          },
        },
        subscriptions: {
          include: { product: true },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }

    // 1. Collect all products owned/active for this customer
    const currentProductsMap = new Map<string, {
      id: string;
      name: string;
      categoryName: string;
      status: string;
      quantity: number;
      unit: string;
      basePrice: number;
      source: string;
    }>();

    // From confirmed orders:
    for (const o of customer.orders) {
      for (const item of o.items) {
        if (item.product) {
          const existing = currentProductsMap.get(item.productId);
          const qty = (existing?.quantity || 0) + item.quantity;
          currentProductsMap.set(item.productId, {
            id: item.product.id,
            name: item.product.name,
            categoryName: (item.product as any).category?.name || 'Hardware',
            status: o.status === 'CONFIRMED' ? 'ACTIVE ORDER' : o.status,
            quantity: qty,
            unit: item.product.unit || 'unit',
            basePrice: item.product.basePrice,
            source: `Order #${o.orderNumber}`,
          });
        }
      }
    }

    // From active subscriptions:
    for (const s of customer.subscriptions) {
      if (s.product) {
        const existing = currentProductsMap.get(s.productId);
        currentProductsMap.set(s.productId, {
          id: s.product.id,
          name: s.product.name,
          categoryName: (s.product as any).category?.name || 'Subscriptions',
          status: s.status,
          quantity: (existing?.quantity || 0) + 1,
          unit: s.product.unit || 'user/month',
          basePrice: s.product.basePrice,
          source: `Subscription (${s.product.billingInterval || 'MONTHLY'})`,
        });
      }
    }

    // From active quotations (if not already added from orders/subs):
    for (const q of customer.quotations) {
      for (const item of q.items) {
        if (item.product && !currentProductsMap.has(item.productId)) {
          currentProductsMap.set(item.productId, {
            id: item.product.id,
            name: item.product.name,
            categoryName: (item.product as any).category?.name || 'General',
            status: `Quoted (${q.status})`,
            quantity: item.quantity,
            unit: item.product.unit || 'unit',
            basePrice: item.product.basePrice,
            source: `Quote #${q.quoteNumber}`,
          });
        }
      }
    }

    const currentProducts = Array.from(currentProductsMap.values());
    const ownedProductIds = Array.from(currentProductsMap.keys());

    // 2. Fetch active UpsellRules where sourceProductId is in ownedProductIds OR rules for all products if empty
    let upsellRules: any[] = [];
    if (ownedProductIds.length > 0) {
      upsellRules = await prisma.upsellRule.findMany({
        where: {
          sourceProductId: { in: ownedProductIds },
          isActive: true,
        },
        include: {
          sourceProduct: { select: { id: true, name: true, category: { select: { name: true } } } },
          suggestedProduct: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { priority: 'asc' },
      });
    }

    // Fallback: If customer has no existing products or no matching rules, recommend top priority rules
    if (upsellRules.length === 0) {
      upsellRules = await prisma.upsellRule.findMany({
        where: { isActive: true },
        include: {
          sourceProduct: { select: { id: true, name: true, category: { select: { name: true } } } },
          suggestedProduct: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { priority: 'asc' },
        take: 3,
      });
    }

    // 3. Filter out products already owned/quoted by customer to avoid duplicate recommendations
    const suggestedProductIdsSeen = new Set<string>();
    const opportunities = [];

    for (const rule of upsellRules) {
      const suggested = rule.suggestedProduct;
      if (!suggested) continue;
      if (currentProductsMap.has(suggested.id)) continue; // Already owned
      if (suggestedProductIdsSeen.has(suggested.id)) continue; // Already added to response

      suggestedProductIdsSeen.add(suggested.id);

      const sourceProductName = rule.sourceProduct?.name || 'purchased products';
      const isSameCategory = rule.sourceProduct?.category?.name === suggested.category?.name;
      const opportunityType = isSameCategory ? 'Upsell' : 'Cross-sell';

      let reason = `Recommended based on customer's existing ${sourceProductName}.`;
      if (rule.promotionTag) {
        reason = `[${rule.promotionTag}] Complementary to ${sourceProductName}.`;
      }

      // Customer Portal Isolation: sanitize internal margin/cost details for CUSTOMER role
      const isInternal = req.user?.role !== 'CUSTOMER';

      opportunities.push({
        id: rule.id,
        opportunityType,
        recommendedProduct: {
          id: suggested.id,
          name: suggested.name,
          description: suggested.description,
          unit: suggested.unit,
          basePrice: suggested.basePrice,
          categoryName: suggested.category?.name || 'General',
          costPrice: isInternal ? suggested.costPrice : undefined,
          marginAmount: isInternal ? Math.max(0, suggested.basePrice - suggested.costPrice) : undefined,
        },
        sourceProduct: {
          id: rule.sourceProductId,
          name: sourceProductName,
        },
        promotionTag: rule.promotionTag,
        priority: rule.priority,
        reason,
      });
    }

    res.json({
      customerId: customer.id,
      companyName: customer.companyName,
      customerTier: customer.tier?.name || 'Standard',
      currentProductsCount: currentProducts.length,
      currentProducts,
      opportunitiesCount: opportunities.length,
      opportunities,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to evaluate customer growth opportunities.' });
  }
};

export const getMyQuotationRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.user?.customerId;

    if (req.user?.role !== 'CUSTOMER' || !customerId) {
      res.status(403).json({ error: 'Access denied. Endpoint is only available for authenticated customer accounts.' });
      return;
    }

    // 1. Fetch authenticated customer's eligible quotations (excluding CANCELLED & REJECTED)
    const activeQuotations = await prisma.quotation.findMany({
      where: {
        customerId,
        status: { in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'NEGOTIATION', 'ACCEPTED'] },
      },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeQuotations.length === 0) {
      res.json({
        message: 'Recommendations will appear based on your eligible quotations.',
        quotationsCount: 0,
        recommendationsCount: 0,
        recommendations: [],
      });
      return;
    }

    // 2. Map products from customer's eligible quotations and keep track of quote numbers & source products
    const quotedProductsMap = new Map<string, { productId: string; productName: string; quoteNumber: string; categoryName: string }>();

    for (const q of activeQuotations) {
      for (const item of q.items) {
        if (item.product && !quotedProductsMap.has(item.productId)) {
          quotedProductsMap.set(item.productId, {
            productId: item.productId,
            productName: item.product.name,
            quoteNumber: q.quoteNumber,
            categoryName: item.product.category?.name || 'General',
          });
        }
      }
    }

    const quotedProductIds = Array.from(quotedProductsMap.keys());

    // 3. Fetch active UpsellRules for these quoted products
    const upsellRules = await prisma.upsellRule.findMany({
      where: {
        sourceProductId: { in: quotedProductIds },
        isActive: true,
      },
      include: {
        sourceProduct: { select: { id: true, name: true, category: { select: { name: true } } } },
        suggestedProduct: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { priority: 'asc' },
    });

    // 4. Build customer-safe recommendation list (excluding products already in customer's active quotes)
    const suggestedProductIdsSeen = new Set<string>();
    const recommendations = [];

    for (const rule of upsellRules) {
      const suggested = rule.suggestedProduct;
      if (!suggested) continue;
      if (quotedProductsMap.has(suggested.id)) continue; // Don't suggest product customer is already quoting
      if (suggestedProductIdsSeen.has(suggested.id)) continue;

      suggestedProductIdsSeen.add(suggested.id);

      const sourceInfo = quotedProductsMap.get(rule.sourceProductId);
      const sourceProductName = sourceInfo?.productName || rule.sourceProduct?.name || 'your quotation';
      const quoteNumber = sourceInfo?.quoteNumber ? ` (#${sourceInfo.quoteNumber})` : '';

      const isSameCategory = rule.sourceProduct?.category?.name === suggested.category?.name;
      const opportunityType = isSameCategory ? 'Upsell' : 'Cross-sell';

      const reason = opportunityType === 'Upsell'
        ? `Recommended based on your ${sourceProductName} quotation${quoteNumber}.`
        : `Recommended as a complementary product to ${sourceProductName}${quoteNumber}.`;

      recommendations.push({
        id: rule.id,
        opportunityType,
        recommendedProduct: {
          id: suggested.id,
          name: suggested.name,
          description: suggested.description,
          unit: suggested.unit,
          basePrice: suggested.basePrice,
          categoryName: suggested.category?.name || 'General',
        },
        sourceQuotation: {
          quoteNumber: sourceInfo?.quoteNumber || null,
          sourceProductName,
        },
        promotionTag: rule.promotionTag,
        priority: rule.priority,
        reason,
      });
    }

    res.json({
      quotationsCount: activeQuotations.length,
      recommendationsCount: recommendations.length,
      recommendations,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch customer quotation recommendations.' });
  }
};
