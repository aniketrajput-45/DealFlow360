import { prisma } from '../../config/prisma';

export interface QuotationLineInput {
  productId: string;
  quantity: number;
  unitPrice?: number; // Optional override; defaults to product basePrice or tier pricing rule
  discountPercent: number;
}

export interface EvaluatedLine {
  productId: string;
  productName: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  lineSubtotal: number;
  taxableAmount: number;
  lineTotal: number;
  marginAmount: number;
  marginPercent: number;
  allowedDiscountLimit: number;
  customerTierLimit: number;
  categoryLimit: number;
  riskPoints: number; // Points exceeding the allowed limit
}

export interface RiskEvaluationResult {
  lines: EvaluatedLine[];
  subtotal: number;
  totalDiscountAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
  totalCost: number;
  totalMargin: number;
  overallMarginPercent: number;
  averageDiscountPercent: number;
  riskScore: number; // 0 to 100 scale
  requiredApprovalLevel: 'NONE' | 'SALES_MANAGER' | 'SALES_MANAGER_AND_FINANCE';
  riskExplanation: string;
  requiresApproval: boolean;
}

export class RiskEngineService {
  /**
   * Evaluates a quotation's lines against customer tier and category discount ceilings.
   * Calculates mathematical blended risk and determines required approval level.
   */
  static async evaluateQuote(
    customerId: string,
    items: QuotationLineInput[]
  ): Promise<RiskEvaluationResult> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { tier: true },
    });

    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found.`);
    }

    const customerTierLimit = customer.tier.maxDiscountPercent; // e.g. Bronze: 5, Silver: 10, Gold: 15

    // Fetch product details, categories, discount rules, and pricing rules
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        category: {
          include: {
            discountRules: { where: { isActive: true } },
          },
        },
        pricingRules: {
          where: {
            customerTierId: customer.tierId,
            isActive: true,
          },
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const evaluatedLines: EvaluatedLine[] = [];
    let subtotal = 0;
    let totalDiscountAmount = 0;
    let totalTaxAmount = 0;
    let totalAmount = 0;
    let totalCost = 0;

    let maxLineViolation = 0;
    let violationLineCount = 0;

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found.`);
      }

      // 1. Resolve unit price (custom override -> tier pricing rule -> base price)
      let resolvedUnitPrice = product.basePrice;
      if (product.pricingRules && product.pricingRules.length > 0) {
        resolvedUnitPrice = product.pricingRules[0].price;
      }
      if (item.unitPrice !== undefined && item.unitPrice > 0) {
        resolvedUnitPrice = item.unitPrice;
      }

      const quantity = Math.max(1, item.quantity);
      const discountPercent = Math.min(100, Math.max(0, item.discountPercent || 0));
      const lineSubtotal = Math.round(quantity * resolvedUnitPrice * 100) / 100;
      const discountAmount = Math.round(lineSubtotal * (discountPercent / 100) * 100) / 100;
      const taxableAmount = Math.round((lineSubtotal - discountAmount) * 100) / 100;
      const taxPercent = product.taxPercent || 18;
      const taxAmount = Math.round(taxableAmount * (taxPercent / 100) * 100) / 100;
      const lineTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

      const costPrice = product.costPrice || 0;
      const costTotal = quantity * costPrice;
      const marginAmount = Math.round((taxableAmount - costTotal) * 100) / 100;
      const marginPercent = taxableAmount > 0 ? Math.round((marginAmount / taxableAmount) * 1000) / 10 : 0;

      // 2. Resolve discount ceilings:
      // Category limit
      const categoryRule = product.category.discountRules[0];
      const categoryLimit = categoryRule ? categoryRule.maxDiscountPercent : 10;

      // Effective allowed ceiling is MIN of Customer Tier allowance and Category allowance
      const allowedDiscountLimit = Math.min(customerTierLimit, categoryLimit);

      // Line Risk Points: points by which applied discount exceeds allowed limit
      const riskPoints = Math.max(0, Math.round((discountPercent - allowedDiscountLimit) * 10) / 10);

      if (riskPoints > 0) {
        violationLineCount++;
        if (riskPoints > maxLineViolation) {
          maxLineViolation = riskPoints;
        }
      }

      subtotal += lineSubtotal;
      totalDiscountAmount += discountAmount;
      totalTaxAmount += taxAmount;
      totalAmount += lineTotal;
      totalCost += costTotal;

      evaluatedLines.push({
        productId: product.id,
        productName: product.name,
        categoryName: product.category.name,
        quantity,
        unitPrice: resolvedUnitPrice,
        costPrice,
        discountPercent,
        discountAmount,
        taxPercent,
        taxAmount,
        lineSubtotal,
        taxableAmount,
        lineTotal,
        marginAmount,
        marginPercent,
        allowedDiscountLimit,
        customerTierLimit,
        categoryLimit,
        riskPoints,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    totalDiscountAmount = Math.round(totalDiscountAmount * 100) / 100;
    totalTaxAmount = Math.round(totalTaxAmount * 100) / 100;
    totalAmount = Math.round(totalAmount * 100) / 100;
    const totalMargin = Math.round((subtotal - totalDiscountAmount - totalCost) * 100) / 100;
    const overallMarginPercent = subtotal - totalDiscountAmount > 0
      ? Math.round((totalMargin / (subtotal - totalDiscountAmount)) * 1000) / 10
      : 0;
    const averageDiscountPercent = subtotal > 0
      ? Math.round((totalDiscountAmount / subtotal) * 1000) / 10
      : 0;

    // 3. Mathematical Blended Risk Score Calculation (0 to 100 scale)
    // Formula:
    // - Weighted Violation: average violation weighted by line volume
    // - Peak Violation: worst single-line excess
    // - Multi-line spread penalty: penalizes spreading small violations across many items
    let weightedViolationSum = 0;
    for (const l of evaluatedLines) {
      weightedViolationSum += l.riskPoints * l.lineSubtotal;
    }
    const weightedViolation = subtotal > 0 ? weightedViolationSum / subtotal : 0;

    let computedRisk = (weightedViolation * 3.5) + (maxLineViolation * 2.0);
    if (violationLineCount > 1) {
      computedRisk += (violationLineCount - 1) * 3.0; // Multi-line spread penalty
    }

    // Cap risk score between 0 and 100
    const riskScore = Math.min(100, Math.round(computedRisk * 10) / 10);

    // 4. Approval Level Routing
    let requiredApprovalLevel: 'NONE' | 'SALES_MANAGER' | 'SALES_MANAGER_AND_FINANCE' = 'NONE';
    let riskExplanation = 'All applied discounts are within customer tier and product category limits.';

    if (riskScore > 0) {
      if (riskScore > 20 || maxLineViolation > 7.0) {
        requiredApprovalLevel = 'SALES_MANAGER_AND_FINANCE';
        riskExplanation = `High risk detected (Risk Score: ${riskScore}). Line discount exceeds ceiling by up to ${maxLineViolation}% with blended margin erosion. Requires Sales Manager and Finance approval.`;
      } else {
        requiredApprovalLevel = 'SALES_MANAGER';
        riskExplanation = `Moderate discount overage detected (Risk Score: ${riskScore}). Line discount exceeds ceiling by up to ${maxLineViolation}%. Requires Sales Manager approval.`;
      }
    }

    return {
      lines: evaluatedLines,
      subtotal,
      totalDiscountAmount,
      totalTaxAmount,
      totalAmount,
      totalCost,
      totalMargin,
      overallMarginPercent,
      averageDiscountPercent,
      riskScore,
      requiredApprovalLevel,
      riskExplanation,
      requiresApproval: requiredApprovalLevel !== 'NONE',
    };
  }
}
