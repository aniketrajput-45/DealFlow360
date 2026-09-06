import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { RiskEngineService } from '../risk-engine/risk.service';
import { AuditService } from '../audit/audit.service';

export const evaluateQuotePreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, items } = req.body;
    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'customerId and non-empty items array are required.' });
      return;
    }

    const evaluation = await RiskEngineService.evaluateQuote(customerId, items);
    res.json(evaluation);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Quote evaluation failed.' });
  }
};

export const createQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, customerId, items, validDays = 30, saveDraft = false } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'customerId and items are required.' });
      return;
    }

    // 1. Authoritative Backend Risk & Financial Evaluation
    const evaluation = await RiskEngineService.evaluateQuote(customerId, items);

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    let resultQuote;

    if (id) {
      // Updating an existing quotation (e.g. draft update or draft submit)
      const existingQuote = await prisma.quotation.findUnique({
        where: { id },
        include: { approvals: true },
      });

      if (!existingQuote) {
        res.status(404).json({ error: 'Quotation not found.' });
        return;
      }

      const isDraft = saveDraft;
      const initialStatus = isDraft
        ? 'DRAFT'
        : evaluation.requiresApproval
        ? 'PENDING_APPROVAL'
        : 'APPROVED';

      resultQuote = await prisma.$transaction(async (tx) => {
        // Delete existing items for clean update
        await tx.quotationItem.deleteMany({
          where: { quotationId: id },
        });

        const quote = await tx.quotation.update({
          where: { id },
          data: {
            customerId,
            status: initialStatus,
            subtotal: evaluation.subtotal,
            discountAmount: evaluation.totalDiscountAmount,
            taxAmount: evaluation.totalTaxAmount,
            totalAmount: evaluation.totalAmount,
            totalMargin: evaluation.totalMargin,
            riskScore: evaluation.riskScore,
            requiredApprovalLevel: evaluation.requiredApprovalLevel,
            validUntil,
            items: {
              create: evaluation.lines.map((l) => ({
                productId: l.productId,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                costPrice: l.costPrice,
                discountPercent: l.discountPercent,
                discountAmount: l.discountAmount,
                taxPercent: l.taxPercent,
                lineSubtotal: l.lineSubtotal,
                lineTotal: l.lineTotal,
                marginAmount: l.marginAmount,
                riskPoints: l.riskPoints,
              })),
            },
          },
          include: {
            items: { include: { product: true } },
            customer: { include: { tier: true } },
            createdBy: { select: { id: true, name: true, email: true } },
          },
        });

        // Only create approval if NOT a draft AND approval is required AND no pending approval exists yet
        if (!isDraft && evaluation.requiresApproval) {
          const existingPendingApproval = await tx.approval.findFirst({
            where: { quotationId: id, status: 'PENDING' },
          });
          if (!existingPendingApproval) {
            await tx.approval.create({
              data: {
                quotationId: quote.id,
                approvalLevel: evaluation.requiredApprovalLevel,
                status: 'PENDING',
                riskScore: evaluation.riskScore,
                reason: evaluation.riskExplanation,
              },
            });
          }
        }

        return quote;
      });

      await AuditService.record({
        userId,
        action: isDraft
          ? 'QUOTE_UPDATED_DRAFT'
          : evaluation.requiresApproval
          ? 'QUOTE_SUBMITTED_PENDING_APPROVAL'
          : 'QUOTE_SUBMITTED_AUTO_APPROVED',
        entityType: 'Quotation',
        entityId: resultQuote.id,
        details: {
          quoteNumber: resultQuote.quoteNumber,
          totalAmount: resultQuote.totalAmount,
          riskScore: evaluation.riskScore,
          requiredApprovalLevel: evaluation.requiredApprovalLevel,
        },
      });

      res.status(200).json(resultQuote);
      return;
    }

    // Creating a brand new quotation
    const count = await prisma.quotation.count();
    const quoteNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const isDraft = saveDraft;
    const initialStatus = isDraft
      ? 'DRAFT'
      : evaluation.requiresApproval
      ? 'PENDING_APPROVAL'
      : 'APPROVED';

    resultQuote = await prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.create({
        data: {
          quoteNumber,
          customerId,
          createdById: userId,
          status: initialStatus,
          subtotal: evaluation.subtotal,
          discountAmount: evaluation.totalDiscountAmount,
          taxAmount: evaluation.totalTaxAmount,
          totalAmount: evaluation.totalAmount,
          totalMargin: evaluation.totalMargin,
          riskScore: evaluation.riskScore,
          requiredApprovalLevel: evaluation.requiredApprovalLevel,
          validUntil,
          items: {
            create: evaluation.lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              costPrice: l.costPrice,
              discountPercent: l.discountPercent,
              discountAmount: l.discountAmount,
              taxPercent: l.taxPercent,
              lineSubtotal: l.lineSubtotal,
              lineTotal: l.lineTotal,
              marginAmount: l.marginAmount,
              riskPoints: l.riskPoints,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          customer: { include: { tier: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      // If approval required AND NOT A DRAFT, create the initial Approval record
      if (!isDraft && evaluation.requiresApproval) {
        await tx.approval.create({
          data: {
            quotationId: quote.id,
            approvalLevel: evaluation.requiredApprovalLevel,
            status: 'PENDING',
            riskScore: evaluation.riskScore,
            reason: evaluation.riskExplanation,
          },
        });
      }

      return quote;
    });

    await AuditService.record({
      userId,
      action: isDraft
        ? 'QUOTE_CREATED_DRAFT'
        : evaluation.requiresApproval
        ? 'QUOTE_CREATED_PENDING_APPROVAL'
        : 'QUOTE_CREATED_AUTO_APPROVED',
      entityType: 'Quotation',
      entityId: resultQuote.id,
      details: {
        quoteNumber: resultQuote.quoteNumber,
        totalAmount: resultQuote.totalAmount,
        riskScore: evaluation.riskScore,
        requiredApprovalLevel: evaluation.requiredApprovalLevel,
      },
    });

    res.status(201).json(resultQuote);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create quotation.' });
  }
};

export const getQuotations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, customerId } = req.query;

    // Record-level Authorization Filtering:
    // 1. CUSTOMER role only sees quotations for their customerId
    // 2. SALES_REP role only sees quotations created by themselves (createdById = req.user.id)
    let roleFilter: any = {};
    if (req.user?.role === 'CUSTOMER') {
      roleFilter = { customerId: req.user.customerId || 'NONE' };
    } else if (req.user?.role === 'SALES_REP') {
      roleFilter = { createdById: req.user.id };
    } else if (customerId) {
      roleFilter = { customerId: customerId as string };
    }

    const quotes = await prisma.quotation.findMany({
      where: {
        ...roleFilter,
        ...(status ? { status: status as string } : {}),
      },
      include: {
        customer: {
          select: { id: true, companyName: true, contactName: true, email: true, tier: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: { product: true },
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        negotiations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        order: {
          select: { id: true, orderNumber: true, status: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(quotes);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch quotations.' });
  }
};

export const getQuotationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const quote = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: {
          include: { tier: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: { select: { name: true } } },
        },
        items: {
          include: {
            product: {
              include: {
                category: { include: { discountRules: true } },
                inventory: { include: { warehouse: true } },
              },
            },
            comments: {
              include: { user: { select: { id: true, name: true, role: { select: { name: true } } } } },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        approvals: {
          include: {
            actions: {
              include: { user: { select: { id: true, name: true, role: { select: { name: true } } } } },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        negotiations: {
          include: {
            initiatedBy: { select: { id: true, name: true, role: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          include: {
            user: { select: { id: true, name: true, role: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
        order: {
          include: {
            items: { include: { allocations: { include: { warehouse: true } } } },
            invoices: { include: { payments: true } },
            subscriptions: { include: { schedules: true } },
          },
        },
      },
    });

    if (!quote) {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }

    // Boundary check for Customer role:
    if (req.user?.role === 'CUSTOMER' && quote.customerId !== req.user.customerId) {
      res.status(403).json({ error: 'Access denied. You do not have permission to view this quotation.' });
      return;
    }

    // Boundary check for Sales Rep role:
    if (req.user?.role === 'SALES_REP' && quote.createdById !== req.user.id) {
      res.status(403).json({ error: 'Access denied. You can only access your own quotations.' });
      return;
    }

    // For customers, omit internal cost prices and margin amounts from response
    if (req.user?.role === 'CUSTOMER') {
      const sanitized = {
        ...quote,
        totalMargin: undefined,
        items: quote.items.map((i) => ({
          ...i,
          costPrice: undefined,
          marginAmount: undefined,
          riskPoints: undefined,
        })),
      };
      res.json(sanitized);
      return;
    }

    res.json(quote);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch quotation details.' });
  }
};

export const addQuoteComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { message, quotationItemId, isCustomerVisible = true } = req.body;
    const userId = req.user?.id;

    if (!userId || !message) {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    const quote = await prisma.quotation.findUnique({ where: { id } });
    if (!quote) {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }

    if (req.user?.role === 'CUSTOMER' && quote.customerId !== req.user.customerId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    if (req.user?.role === 'SALES_REP' && quote.createdById !== req.user.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const comment = await prisma.quoteComment.create({
      data: {
        quotationId: id,
        quotationItemId: quotationItemId || null,
        userId,
        message,
        isCustomerVisible: req.user?.role === 'CUSTOMER' ? true : isCustomerVisible,
      },
      include: {
        user: { select: { id: true, name: true, role: { select: { name: true } } } },
      },
    });

    await AuditService.record({
      userId,
      action: 'QUOTE_COMMENT_ADDED',
      entityType: 'Quotation',
      entityId: id,
      details: { quotationItemId, isCustomerVisible },
    });

    res.status(201).json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to post comment.' });
  }
};
