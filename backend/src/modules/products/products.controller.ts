import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';

export const getProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: {
          include: {
            discountRules: { where: { isActive: true } },
          },
        },
        inventory: {
          include: { warehouse: true },
        },
        pricingRules: {
          where: { isActive: true },
          include: { customerTier: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = products.map((p) => {
      const totalStock = p.inventory.reduce((sum, inv) => sum + inv.quantityAvailable, 0);
      const categoryDiscountRule = p.category.discountRules[0];
      const categoryMaxDiscount = categoryDiscountRule ? categoryDiscountRule.maxDiscountPercent : 0;

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        unit: p.unit,
        basePrice: p.basePrice,
        costPrice: p.costPrice,
        taxPercent: p.taxPercent,
        productType: p.productType,
        billingInterval: p.billingInterval,
        category: {
          id: p.category.id,
          name: p.category.name,
          maxDiscountPercent: categoryMaxDiscount,
        },
        totalStock,
        inventory: p.inventory.map((inv) => ({
          warehouseId: inv.warehouseId,
          warehouseName: inv.warehouse.name,
          warehouseCode: inv.warehouse.code,
          quantityAvailable: inv.quantityAvailable,
        })),
        tierPricing: p.pricingRules.map((pr) => ({
          tierId: pr.customerTierId,
          tierName: pr.customerTier?.name,
          price: pr.price,
        })),
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch products.' });
  }
};

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      include: {
        discountRules: { where: { isActive: true } },
      },
    });

    const formatted = categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      maxDiscountPercent: c.discountRules[0]?.maxDiscountPercent ?? 10,
      approvalLevel: c.discountRules[0]?.approvalLevel ?? 'SALES_MANAGER',
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch categories.' });
  }
};

export const getUpsellSuggestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const rules = await prisma.upsellRule.findMany({
      where: {
        sourceProductId: productId,
        isActive: true,
      },
      include: {
        suggestedProduct: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { priority: 'asc' },
    });

    // Calculate real margin delta for each suggestion
    const suggestions = rules.map((r) => {
      const sp = r.suggestedProduct;
      const margin = sp.basePrice - sp.costPrice;
      const marginPercent = sp.basePrice > 0 ? ((margin / sp.basePrice) * 100).toFixed(1) : '0';

      return {
        id: sp.id,
        name: sp.name,
        description: sp.description,
        basePrice: sp.basePrice,
        costPrice: sp.costPrice,
        taxPercent: sp.taxPercent,
        unit: sp.unit,
        productType: sp.productType,
        billingInterval: sp.billingInterval,
        category: sp.category.name,
        promotionTag: r.promotionTag,
        marginDelta: margin,
        marginPercent: parseFloat(marginPercent),
      };
    });

    res.json(suggestions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch upsell suggestions.' });
  }
};
